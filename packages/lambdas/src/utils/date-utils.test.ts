import { describe, expect, it } from "vitest";
import { isInPreviousMonth } from "./date-utils";

describe("date-utils", () => {
  it("should return true if the date is in the previous month", () => {
    const tests = [
      {
        date: new Date("2024-02-01"),
        compareDate: new Date("2024-03-01"),
        expected: true,
      }, // Beginning of previous month
      {
        date: new Date("2024-02-28"),
        compareDate: new Date("2024-03-01"),
        expected: true,
      }, // End of previous month
      {
        date: new Date("2024-03-01"),
        compareDate: new Date("2024-03-04"),
        expected: false,
      }, // Start of current month
      {
        date: new Date("2024-01-15"),
        compareDate: new Date("2024-03-04"),
        expected: false,
      }, // Two months ago
      {
        date: new Date("2023-12-31"),
        compareDate: new Date("2024-03-04"),
        expected: false,
      }, // Previous year
      {
        date: new Date("2024-04-01"),
        compareDate: new Date("2024-03-04"),
        expected: false,
      }, // Future month
      // Edge case: December to January transition
      {
        date: new Date("2023-12-15"),
        compareDate: new Date("2024-01-15"),
        expected: true,
      },
    ];

    for (const test of tests) {
      expect(isInPreviousMonth(test.date, test.compareDate)).toBe(
        test.expected
      );
    }
  });
});
