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
}
