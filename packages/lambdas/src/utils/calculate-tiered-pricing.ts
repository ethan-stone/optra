import { SubscriptionPricing } from "@optra/core/schema";

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
      if (currentMinUnits > previousMaxUnit + 1) {
        throw new Error(
          `There is a gap between price ${i} minUnits and price ${
            i - 1
          } maxUntis`
        );
      }
      if (currentMinUnits < previousMaxUnit + 1) {
        throw new Error(
          `There is an overlap between price ${i} minUnits and price ${
            i - 1
          } maxUnits`
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

    remainingUnitsToCalculate -= quantityForCurrentPrice;

    tieredPrice.tiers.push({ ...price, quantity: quantityForCurrentPrice });

    if (price.centsPerUnit !== null) {
      tieredPrice.estimatedTotalInCents +=
        parseFloat(price.centsPerUnit) * quantityForCurrentPrice;
    }
  }

  return tieredPrice;
}
