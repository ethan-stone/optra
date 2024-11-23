import {
  addBillingInfo,
  getWorkspaceByTenantId,
} from "@/server/data/workspaces";
import { getTenantId } from "@/utils/auth";
import { redirect } from "next/navigation";
import { Resource } from "sst";
import Stripe from "stripe";

type Props = {
  searchParams: {
    session_id?: string;
    plan?: string;
  };
};

export default async function Page({ searchParams }: Props) {
  // If session_id or plan is not provided it means the user directly went to this page
  // rather than going through the checkout flow.
  // So we redirect them to the billing page.
  const tenantId = await getTenantId();

  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    return redirect("/sign-up");
  }

  if (!searchParams.session_id || !searchParams.plan) {
    return redirect("/dashboard/settings/billing");
  }

  // If the plan is not pro we redirect them to the billing page.
  if (searchParams.plan !== "pro") {
    return redirect("/dashboard/settings/billing");
  }

  if (workspace.billingInfo) {
    return redirect("/dashboard/settings/billing");
  }

  const stripe = new Stripe(Resource.StripeApiKey.value);

  const session = await stripe.checkout.sessions.retrieve(
    searchParams.session_id,
  );

  if (!session) {
    return <div>Stripe session {searchParams.session_id} not found</div>;
  }

  if (!session.customer) {
    return <div>Stripe session {searchParams.session_id} has no customer</div>;
  }

  const [customer, setupIntent] = await Promise.all([
    stripe.customers.retrieve(session.customer as string),
    stripe.setupIntents.retrieve(session.setup_intent as string),
  ]);

  if (customer.deleted) {
    return <div>Stripe customer {session.customer as string} is deleted</div>;
  }

  if (!setupIntent) {
    return (
      <div>Stripe setup intent {session.setup_intent as string} not found</div>
    );
  }

  if (setupIntent.status !== "succeeded") {
    return (
      <div>
        Stripe setup intent {session.setup_intent as string} is not succeeded
      </div>
    );
  }

  const paymentMethodId = setupIntent.payment_method as string;

  if (!paymentMethodId) {
    return (
      <div>
        Stripe setup intent {session.setup_intent as string} has no payment
        method
      </div>
    );
  }

  await stripe.customers.update(session.customer as string, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  const now = new Date();

  await addBillingInfo({
    workspaceId: workspace.id,
    plan: "pro",
    customerId: session.customer as string,
    createdAt: now,
    updatedAt: now,
  });

  return <div>Success</div>;
}
