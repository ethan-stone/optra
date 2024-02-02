import { describe, expect, it } from "vitest";
import { calculateTieredPrices } from "./calculate-tiered-pricing";

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
    const prices = [
      {
        minUnits: 1,
        maxUnits: 5,
        centsPerUnit: "1",
      },
      {
        minUnits: 6,
        maxUnits: 10,
        centsPerUnit: "2",
      },
      {
        minUnits: 11,
        maxUnits: null,
        centsPerUnit: "3",
      },
    ];

    // 5 * 1 = 5
    // 5 * 2 = 10
    // 90 * 3 = 270
    // total = 285

    const units = 100;
    const result = calculateTieredPrices(prices, units);
    console.log(result);
    expect(result.estimatedTotalInCents).toBe(285);
    expect(result.tiers.length).toBe(3);
    expect(result.tiers[0].quantity).toBe(5);
    expect(result.tiers[1].quantity).toBe(5);
    expect(result.tiers[2].quantity).toBe(90);
  });
});
