import { SubscriptionPricing } from "@optra/db/schema";

type TieredPrice = {
  tiers: (SubscriptionPricing & { quantity: number })[];
  estimatedTotalInCents: number; // do not use for billing
};

export function calculateTieredPrices(
  prices: SubscriptionPricing[],
  units: number
) {
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
