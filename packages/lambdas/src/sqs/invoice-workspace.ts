import { stripe } from "../utils/stripe";
import {
  calculateProratedPrice,
  calculateTieredPrices,
} from "../utils/calculate-tiered-pricing";
import { WorkspaceRepo } from "@optra/core/workspaces";
import { TokenGenerationRepo } from "@optra/core/token-generations";
import { TokenVerificationRepo } from "@optra/core/token-verifications";
import { isInPreviousMonth } from "src/utils/date-utils";

export type InvoiceWorkspaceArgs = {
  workspaceId: string;
  month: number;
  year: number;
};

export async function invoiceWorkspace(
  args: InvoiceWorkspaceArgs,
  ctx: {
    workspaceRepo: WorkspaceRepo;
    tokenGenerationRepo: TokenGenerationRepo;
    tokenVerificationsRepo: TokenVerificationRepo;
  }
): Promise<void> {
  const { workspaceId, month, year } = args;

  console.log(`Invoicing workspace ${workspaceId} for ${month}/${year}`);

  const workspace = await ctx.workspaceRepo.getById(workspaceId);

  const billingInfo = workspace?.billingInfo;

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

  const now = new Date(year, month - 1, 1);

  const planStart = billingInfo.planChangedAt;

  let planFee = billingInfo.subscriptions.plan.cents;

  // if the plan change last month then we need to calculate the prorated amount
  if (isInPreviousMonth(planStart, now)) {
    planFee = calculateProratedPrice({
      monthlyFee: parseFloat(billingInfo.subscriptions.plan.cents),
      startDate: planStart,
      billingDate: new Date(year, month - 1, 1),
    }).toString();
  }

  await stripe.invoiceItems.create(
    {
      invoice: invoice.id,
      customer: billingInfo.customerId,
      quantity: 1,
      price_data: {
        currency: "usd",
        product: billingInfo.subscriptions.plan.productId,
        unit_amount_decimal: planFee,
      },
      currency: "usd",
      description: "Pro Plan",
    },
    {
      idempotencyKey: `invoice-item-${workspaceId}-${month}-${year}-plan`,
    }
  );

  console.log(`Added invoice item for pro plan. Invoice: ${invoice.id}`);

  // get token generations from the last month
  const tokenGenerations = await ctx.tokenGenerationRepo.getTotals({
    month,
    year,
    workspaceId,
  });

  // invoice items for token generations
  const tokenGenerationPrice = calculateTieredPrices(
    billingInfo.subscriptions.tokens.pricing,
    tokenGenerations.total
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

      console.log(
        `Added invoice item for token generations. Invoice: ${invoice.id}`
      );
    }
  }

  // invoice items for token verifications
  const tokenVerifications = await ctx.tokenVerificationsRepo.getTotals({
    month,
    year,
    workspaceId,
  });

  const tokenVerificationPrice = calculateTieredPrices(
    billingInfo.subscriptions.verifications.pricing,
    tokenVerifications.successful
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

      console.log(
        `Added invoice item for token verifications. Invoice: ${invoice.id}`
      );
    }
  }

  console.log(
    `Created draft invoice ${invoice.id} for workspace ${workspaceId}`
  );

  console.log(`Checking if workspace requested a plan change.`);

  if (billingInfo.requestedPlanChangeTo !== null) {
    console.log(
      `Workspace ${workspaceId} requested a plan change to ${billingInfo.requestedPlanChangeTo}.`
    );

    await ctx.workspaceRepo.changePlan(
      workspaceId,
      billingInfo.requestedPlanChangeTo
    );
  }
}
