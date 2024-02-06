import { getAnalytics } from "./analytics";
import { db } from "./db";
import { stripe } from "./stripe";
import { calculateTieredPrices } from "./utils/calculate-tiered-pricing";

export type InvoiceWorkspaceArgs = {
  workspaceId: string;
  month: number;
  year: number;
};

export async function invoiceWorkspace(
  args: InvoiceWorkspaceArgs
): Promise<void> {
  const { workspaceId, month, year } = args;

  console.log(`Invoicing workspace ${workspaceId} for ${month}/${year}`);

  const billingInfo = await db.query.workspaceBillingInfo.findFirst({
    where: (table, { eq }) => eq(table.workspaceId, workspaceId),
  });

  const workspace = await db.query.workspaces.findFirst({
    where: (table, { eq }) => eq(table.id, workspaceId),
  });

  if (!billingInfo || !workspace) {
    throw new Error(`Could not find billing info for workspace ${workspaceId}`);
  }

  if (billingInfo.plan === "free") {
    console.log(
      `Workspace ${workspaceId} is on the free plan, skipping invoice`
    );
    return;
  }

  const invoice = await stripe.invoices.create(
    {
      customer: billingInfo.customerId,
      auto_advance: false,
      description: `Invoice for ${month}/${year}`,
      collection_method: "charge_automatically",
      metadata: {
        workspaceId,
        month: month.toString(),
        year: year.toString(),
      },
      custom_fields: [
        {
          name: "Workspace",
          value: workspace.name,
        },
        {
          name: "Billing Period",
          value: new Date(year, month - 1, 1).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          }),
        },
      ],
    },
    {
      idempotencyKey: `invoice-${workspaceId}-${month}-${year}`,
    }
  );

  if (!billingInfo.subscriptions) {
    throw new Error(`Workspace ${workspaceId} does not have any subscriptions`);
  }

  // fixed invoice item for the plan
  await stripe.invoiceItems.create(
    {
      invoice: invoice.id,
      customer: billingInfo.customerId,
      quantity: 1,
      price_data: {
        currency: "usd",
        product: billingInfo.subscriptions.plan.productId,
        unit_amount_decimal: billingInfo.subscriptions.plan.cents,
      },
      currency: "usd",
      description: "Pro Plan",
    },
    {
      idempotencyKey: `invoice-item-${workspaceId}-${month}-${year}-plan`,
    }
  );

  const analytics = getAnalytics();

  // get token generations from the last month
  const tokenGenerations = await analytics.getGenerationsForWorkspace({
    month,
    year,
    workspaceId,
  });

  // invoice items for token generations
  const tokenGenerationPrice = calculateTieredPrices(
    billingInfo.subscriptions.tokens.pricing,
    tokenGenerations.totalGenerations
  );

  for (const price of tokenGenerationPrice.tiers) {
    if (price.quantity > 0 && price.centsPerUnit !== null) {
      await stripe.invoiceItems.create(
        {
          customer: billingInfo.customerId,
          currency: "usd",
          quantity: price.quantity,
          invoice: invoice.id,
          price_data: {
            currency: "usd",
            product: billingInfo.subscriptions.tokens.productId,
            unit_amount_decimal: price.centsPerUnit,
          },
          description: `Token Generations ${price.minUnits}${
            price.maxUnits ? ` - ${price.maxUnits}` : "+"
          }`,
        },
        {
          idempotencyKey: `invoice-item-${workspaceId}-${month}-${year}-token-generations`,
        }
      );
    }
  }

  // invoice items for token verifications
  const tokenVerifications = await analytics.getVerificationsForWorkspace({
    month,
    year,
    workspaceId,
  });

  const tokenVerificationPrice = calculateTieredPrices(
    billingInfo.subscriptions.verifications.pricing,
    tokenVerifications.successfulVerifications
  );

  for (const price of tokenVerificationPrice.tiers) {
    if (price.quantity > 0 && price.centsPerUnit !== null) {
      await stripe.invoiceItems.create(
        {
          customer: billingInfo.customerId,
          currency: "usd",
          quantity: price.quantity,
          invoice: invoice.id,
          price_data: {
            currency: "usd",
            product: billingInfo.subscriptions.verifications.productId,
            unit_amount_decimal: price.centsPerUnit,
          },
          description: `Token Verifications ${price.minUnits}${
            price.maxUnits ? ` - ${price.maxUnits}` : "+"
          }`,
        },
        {
          idempotencyKey: `invoice-item-${workspaceId}-${month}-${year}-token-verifications`,
        }
      );
    }
  }

  console.log(
    `Created draft invoice ${invoice.id} for workspace ${workspaceId}`
  );
}
