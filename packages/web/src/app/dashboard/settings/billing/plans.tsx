"use client";

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
  hasBillingInfo: boolean;
};

function PlanItem({
  name,
  description,
  features,
  isCurrentPlan,
  hasBillingInfo,
}: PlanItemProps) {
  const router = useRouter();

  const createCheckoutSession =
    api.workspaces.createCheckoutSession.useMutation();

  async function choosePlan() {
    if (!hasBillingInfo) {
      const session = await createCheckoutSession.mutateAsync();
      if (session) {
        router.push(session.url);
      }
    } else {
      // TODO: Call mutation to change plan
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
        <Button
          onClick={choosePlan}
          className={`w-full border ${
            !isCurrentPlan
              ? "border-stone-900 bg-white text-stone-900 hover:bg-stone-900 hover:text-stone-50"
              : "border-stone-300 bg-stone-900 text-stone-50"
          }`}
        >
          {isCurrentPlan ? "Current Plan" : "Choose"}
        </Button>
      </CardFooter>
    </Card>
  );
}

const plans: PlanItemProps[] = [
  {
    name: "Free",
    type: "free",
    description: "The free plan",
    features: ["1000 generations per month", "10000 tokens per month"],
    isCurrentPlan: true,
    hasBillingInfo: false,
  },
  {
    name: "Pro",
    type: "pro",
    description: "The pro plan",
    features: ["10000 generations per month", "100000 tokens per month"],
    isCurrentPlan: false,
    hasBillingInfo: false,
  },
  {
    name: "Enterprise",
    type: "enterprise",
    description: "The enterprise plan",
    features: ["Unlimited generations"],
    isCurrentPlan: false,
    hasBillingInfo: false,
  },
];

type PlansProps = {
  currentPlan: "free" | "pro" | "enterprise";
  hasBillingInfo: boolean; // If true the workspace has already entered billing info. So if they change plans it can be done immediately instead of directing to a setup stripe checkout session.
};

export function Plans({ currentPlan, hasBillingInfo }: PlansProps) {
  return (
    <div className="flex flex-row gap-4">
      {plans.map((plan) => (
        <PlanItem
          key={plan.name}
          {...plan}
          isCurrentPlan={plan.type === currentPlan}
          hasBillingInfo={hasBillingInfo}
        />
      ))}
    </div>
  );
}
