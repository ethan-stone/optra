import { Button } from "@/components/ui/button";
import {
  Card,
  CardFooter,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PlanItemProps = {
  name: string;
  description: string;
  features: string[];
  isCurrentPlan: boolean;
};

function PlanItem({
  name,
  description,
  features,
  isCurrentPlan,
}: PlanItemProps) {
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
    description: "The free plan",
    features: ["1000 generations per month", "10000 tokens per month"],
    isCurrentPlan: true,
  },
  {
    name: "Pro",
    description: "The pro plan",
    features: ["10000 generations per month", "100000 tokens per month"],
    isCurrentPlan: false,
  },
  {
    name: "Enterprise",
    description: "The enterprise plan",
    features: ["Unlimited generations"],
    isCurrentPlan: false,
  },
];

export function Plans() {
  return (
    <div className="flex flex-row gap-4">
      {plans.map((plan) => (
        <PlanItem key={plan.name} {...plan} />
      ))}
    </div>
  );
}
