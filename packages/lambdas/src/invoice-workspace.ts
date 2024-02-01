import { SubscriptionPricing } from "@optra/db/schema";
import { db } from "./db";
import { stripe } from "./stripe";

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

  const invoice = await stripe.invoices.create({
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
  });

  if (!billingInfo.subscriptions) {
    throw new Error(`Workspace ${workspaceId} does not have any subscriptions`);
  }

  // fixed invoice item for the plan
  await stripe.invoiceItems.create({
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
  });

  // get token generations from the last month
  const tokenGenerations = 100000;

  // invoice items for token generations
  const tokenGenerationPrice = calculateTieredPrices(
    billingInfo.subscriptions.tokens.pricing,
    tokenGenerations
  );

  for (const price of tokenGenerationPrice.tiers) {
    if (price.quantity > 0 && price.centsPerUnit !== null) {
      await stripe.invoiceItems.create({
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
      });
    }
  }

  // invoice items for token verifications
  const tokenVerifications = 1000000;

  const tokenVerificationPrice = calculateTieredPrices(
    billingInfo.subscriptions.verifications.pricing,
    tokenVerifications
  );

  for (const price of tokenVerificationPrice.tiers) {
    if (price.quantity > 0 && price.centsPerUnit !== null) {
      await stripe.invoiceItems.create({
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
      });
    }
  }

  console.log(
    `Created draft invoice ${invoice.id} for workspace ${workspaceId}`
  );
}

type TieredPrice = {
  tiers: (SubscriptionPricing & { quantity: number })[];
  estimatedTotalInCents: number; // do not use for billing
};

function calculateTieredPrices(prices: SubscriptionPricing[], units: number) {
  // validate the prices make sense

  if (prices.length === 0) {
    throw new Error("No prices provided");
  }

  for (let i = 0; i < prices.length; i++) {
    if (i > 0) {
      const currentMinUnits = prices[i].minUnits;
      const previousMaxUnit = prices[i - 1].maxUnits;
      if (previousMaxUnit === null) {
        throw new Error(
          `Every price must have a maxUnits except for the last price`
        );
      }
      if (currentMinUnits > previousMaxUnit) {
        throw new Error(
          `Price ${i} has a minUnits greater than the maxUnits of price ${
            i - 1
          }`
        );
      }
      if (currentMinUnits < previousMaxUnit + 1) {
        throw new Error(
          `There is an over lap between price ${i} and price ${i - 1}`
        );
      }
    }
  }

  const tieredPrice: TieredPrice = { tiers: [], estimatedTotalInCents: 0 };

  let remainingUnitsToCalculate = units;

  for (const price of prices) {
    if (remainingUnitsToCalculate <= 0) {
      break;
    }

    const quantityForCurrentPrice =
      price.maxUnits === null
        ? remainingUnitsToCalculate
        : Math.min(
            price.maxUnits - price.minUnits + 1,
            remainingUnitsToCalculate
          );

    tieredPrice.tiers.push({ ...price, quantity: quantityForCurrentPrice });

    if (price.centsPerUnit !== null) {
      tieredPrice.estimatedTotalInCents +=
        parseFloat(price.centsPerUnit) * quantityForCurrentPrice;
    }
  }

  return tieredPrice;
}
