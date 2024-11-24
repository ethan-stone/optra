"use client";

import { useToast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardFooter,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

type PlanItemProps = {
  name: string;
  type: "free" | "pro" | "enterprise";
  description: string;
  features: string[];
  isCurrentPlan: boolean;
  isNewRequestedPlan: boolean; // true if the user has requested a plan change to this plan
  hasBillingInfo: boolean;
};

function PlanItem({
  name,
  type,
  description,
  features,
  isCurrentPlan,
  isNewRequestedPlan,
  hasBillingInfo,
}: PlanItemProps) {
  const router = useRouter();

  const { toast } = useToast();

  const createCheckoutSession =
    api.workspaces.createCheckoutSession.useMutation();

  const changePlan = api.workspaces.changePlan.useMutation();

  const cancelPlanChange = api.workspaces.cancelPlanChange.useMutation();

  async function choosePlan() {
    if (type === "enterprise") {
      toast({
        title: "Contact support",
        description: "Please contact us to upgrade to the enterprise plan.",
        variant: "destructive",
      });
      return;
    }

    if (!hasBillingInfo) {
      const session = await createCheckoutSession.mutateAsync();
      if (session) {
        router.push(session.url);
      }
    } else if (isNewRequestedPlan) {
      await cancelPlanChange.mutateAsync();

      toast({
        title: "Plan change cancelled",
        description: "Your plan change has been cancelled successfully.",
      });

      router.refresh();
    } else {
      const result = await changePlan.mutateAsync({ plan: type });

      if (result.status === "plan_changed") {
        toast({
          title: "Plan changed",
          description: "Your plan has been changed successfully.",
        });
      } else {
        toast({
          title: "Plan change requested",
          description:
            "Your plan change has been requested successfully. It will take effect on your next billing date.",
        });
      }

      router.refresh();
    }
  }

  return (
    <Card
      className={`flex w-full min-w-80 max-w-96 flex-col justify-between border ${
        isCurrentPlan ? "border-stone-900 bg-stone-100" : "border-stone-300"
      } shadow`}
    >
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {features.map((feature) => (
          <div key={feature} className="flex flex-row items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-stone-800" />
            <p className="text-sm text-stone-800">{feature}</p>
          </div>
        ))}
      </CardContent>
      <CardFooter>
        {type === "enterprise" ? (
          <Button
            variant="outline"
            className="w-full border border-stone-900 bg-white text-stone-900 hover:bg-stone-900 hover:text-stone-50"
          >
            Contact support
          </Button>
        ) : (
          <Button
            onClick={choosePlan}
            className={`w-full border ${
              isCurrentPlan
                ? "border-stone-300 bg-stone-900 text-stone-50"
                : isNewRequestedPlan
                  ? "border-stone-300 bg-red-500 text-stone-50 hover:bg-red-700"
                  : "border-stone-900 bg-white text-stone-900 hover:bg-stone-900 hover:text-stone-50"
            }`}
          >
            {isCurrentPlan
              ? "Current Plan"
              : isNewRequestedPlan
                ? "Cancel Plan Change"
                : "Choose"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

const plans: Omit<
  PlanItemProps,
  "isCurrentPlan" | "isNewRequestedPlan" | "hasBillingInfo"
>[] = [
  {
    name: "Free",
    type: "free",
    description: "The free plan",
    features: ["1000 generations per month", "10000 tokens per month"],
  },
  {
    name: "Pro",
    type: "pro",
    description: "The pro plan",
    features: ["10000 generations per month", "100000 tokens per month"],
  },
  {
    name: "Enterprise",
    type: "enterprise",
    description: "The enterprise plan",
    features: ["Unlimited generations"],
  },
];

type PlansProps = {
  currentPlan: "free" | "pro" | "enterprise";
  requestedPlanChangeTo: "free" | "pro" | null;
  hasBillingInfo: boolean; // If true the workspace has already entered billing info. So if they change plans it can be done immediately instead of directing to a setup stripe checkout session.
};

export function Plans({
  currentPlan,
  requestedPlanChangeTo,
  hasBillingInfo,
}: PlansProps) {
  return (
    <div className="flex flex-row gap-4">
      {plans.map((plan) => (
        <PlanItem
          key={plan.name}
          {...plan}
          isCurrentPlan={plan.type === currentPlan}
          isNewRequestedPlan={plan.type === requestedPlanChangeTo}
          hasBillingInfo={hasBillingInfo}
        />
      ))}
    </div>
  );
}
