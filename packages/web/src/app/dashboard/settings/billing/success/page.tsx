import {
  addBillingInfo,
  getWorkspaceByTenantId,
} from "@/server/data/workspaces";
import { newLogger } from "@/server/logger";
import { getTenantId } from "@/server/auth/utils";
import Link from "next/link";
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
  const logger = newLogger({
    namespace: "/dashboard/settings/billing/success",
  });

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
    logger.info("Workspace tried to subscribe to a non-pro plan", {
      workspaceId: workspace.id,
    });
    return redirect("/dashboard/settings/billing");
  }

  if (workspace.billingInfo) {
    logger.info("Workspace alrady has a billing info", {
      workspaceId: workspace.id,
    });
    return redirect("/dashboard/settings/billing");
  }

  logger.info("Workspace is subscribing to pro plan. Processing...", {
    workspaceId: workspace.id,
  });

  const stripe = new Stripe(Resource.StripeApiKey.value);

  const session = await stripe.checkout.sessions.retrieve(
    searchParams.session_id,
  );

  if (!session) {
    logger.error("Stripe session not found", {
      workspaceId: workspace.id,
      sessionId: searchParams.session_id,
    });
    return <div>Stripe session {searchParams.session_id} not found</div>;
  }

  if (!session.customer) {
    logger.error("Stripe session has no customer", {
      workspaceId: workspace.id,
      sessionId: searchParams.session_id,
    });
    return <div>Stripe session {searchParams.session_id} has no customer</div>;
  }

  const [customer, setupIntent] = await Promise.all([
    stripe.customers.retrieve(session.customer as string),
    stripe.setupIntents.retrieve(session.setup_intent as string),
  ]);

  if (customer.deleted) {
    logger.error("Stripe customer is deleted", {
      workspaceId: workspace.id,
      customerId: session.customer as string,
    });
    return <div>Stripe customer {session.customer as string} is deleted</div>;
  }

  if (!setupIntent) {
    logger.error("Stripe setup intent not found", {
      workspaceId: workspace.id,
      sessionId: searchParams.session_id,
    });
    return (
      <div>Stripe setup intent {session.setup_intent as string} not found</div>
    );
  }

  if (setupIntent.status !== "succeeded") {
    logger.error("Stripe setup intent is not succeeded", {
      workspaceId: workspace.id,
      sessionId: searchParams.session_id,
    });
    return (
      <div>
        Stripe setup intent {session.setup_intent as string} is not succeeded
      </div>
    );
  }

  const paymentMethodId = setupIntent.payment_method as string;

  if (!paymentMethodId) {
    logger.error("Stripe setup intent has no payment method", {
      workspaceId: workspace.id,
      sessionId: searchParams.session_id,
    });
    return (
      <div>
        Stripe setup intent {session.setup_intent as string} has no payment
        method
      </div>
    );
  }

  logger.info(
    "All validations passed. Updating customer and adding billing info...",
    {
      workspaceId: workspace.id,
    },
  );

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
    planChangedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  logger.info("Billing info added", {
    workspaceId: workspace.id,
  });

  return (
    <div className="flex flex-grow flex-col items-center justify-center gap-4 pt-20">
      <h1 className="text-2xl font-bold">
        Successfully Subscribed to Pro Plan!
      </h1>
      <p className="text-sm text-gray-500">
        You can now start using Optra Pro features. Click{" "}
        <Link className="text-blue-500" href="/dashboard/settings/billing">
          here
        </Link>{" "}
        to manage your billing info.
      </p>
    </div>
  );
}
