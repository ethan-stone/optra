import { describe, expect, it } from "vitest";
import {
  calculateProratedPrice,
  calculateTieredPrices,
} from "./calculate-tiered-pricing";

describe("calculate-tiered-pricing validation tests", () => {
  it("should throw error if array length is 0", () => {
    try {
      calculateTieredPrices([], 10);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      const e = error as Error;
      expect(e.message).toBe("No prices provided");
    }
  });

  it("should throw error if pricing has no maxUnits", () => {
    try {
      calculateTieredPrices(
        [
          {
            minUnits: 6,
            maxUnits: null,
            centsPerUnit: "1",
          },
          {
            minUnits: 0,
            maxUnits: null,
            centsPerUnit: "1",
          },
        ],
        10
      );
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      const e = error as Error;
      expect(e.message).toBe(
        "Every price must have a maxUnits except for the last price"
      );
    }
  });

  it("should throw error if there is a gap between two prices maxUnits and minUnits", () => {
    try {
      calculateTieredPrices(
        [
          {
            minUnits: 0,
            maxUnits: 5,
            centsPerUnit: "1",
          },
          {
            minUnits: 7,
            maxUnits: 8,
            centsPerUnit: "1",
          },
        ],
        10
      );
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      const e = error as Error;
      expect(e.message).toBe(
        `There is a gap between price 1 minUnits and price 0 maxUntis`
      );
    }
  });

  it("should throw an error if there is an overlap between two prices maxUnits and minUnits", () => {
    try {
      calculateTieredPrices(
        [
          {
            minUnits: 0,
            maxUnits: 5,
            centsPerUnit: "1",
          },
          {
            minUnits: 3,
            maxUnits: 8,
            centsPerUnit: "1",
          },
        ],
        10
      );
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      const e = error as Error;
      expect(e.message).toBe(
        `There is an overlap between price 1 minUnits and price 0 maxUnits`
      );
    }
  });
});

describe("calculate-tiered-pricing calculation tests", () => {
  it("should calculate the tiered prices correctly", () => {
    // this price is similar to what is charged
    // for token generations

    // first 100k token generations are free
    // anything after is $0.0002 per token or .02 cents per token
    const prices = [
      {
        minUnits: 1,
        maxUnits: 100000,
        centsPerUnit: null,
      },
      {
        minUnits: 100001,
        maxUnits: null,
        centsPerUnit: "0.02",
      },
    ];

    // 100,000 * 0 = 0
    // 900,000 * .02 = 18,000

    const units = 1_000_000;
    const result = calculateTieredPrices(prices, units);
    expect(result.estimatedTotalInCents).toBe(18_000);
    expect(result.tiers.length).toBe(2);
    expect(result.tiers[0].quantity).toBe(100_000);
    expect(result.tiers[1].quantity).toBe(900_000);
  });
});

describe("calculate-prorated-price tests", () => {
  it("should calculate the prorated price correctly", () => {
    const result = calculateProratedPrice({
      monthlyFee: 100,
      startDate: new Date("2024-03-10"), // Started on March 10th
      billingDate: new Date("2024-03-01"), // Billing for March
    });

    expect(result).toBe(70.97);
  });

  it("should return full price if the billing date is not in the same month as the start date", () => {
    const result = calculateProratedPrice({
      monthlyFee: 100,
      startDate: new Date("2024-03-10"),
      billingDate: new Date("2024-04-01"),
    });

    expect(result).toBe(100);
  });

  it("should return full price if the billing date is the same month as the start date", () => {
    const result = calculateProratedPrice({
      monthlyFee: 100,
      startDate: new Date("2024-03-01"),
      billingDate: new Date("2024-03-01"),
    });

    expect(result).toBe(100);
  });
});
