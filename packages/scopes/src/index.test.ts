import { describe, expect, it } from "vitest";
import { ScopeQuery, check } from ".";

describe("RBAC permissions check tests", () => {
  it("should say valid: true for simple and check", () => {
    const query: ScopeQuery = {
      and: ["a", "b"],
    };

    const result = check(query, ["a", "b"]);

    expect(result.valid).toBe(true);
  });

  it("should say valid: false for simple and check", () => {
    const query: ScopeQuery = {
      and: ["a", "b"],
    };

    const result = check(query, ["a"]);

    expect(result.valid).toBe(false);
  });

  it("should say valid: true for simple or check", () => {
    const query: ScopeQuery = {
      or: ["a", "b"],
    };

    const result = check(query, ["a"]);

    expect(result.valid).toBe(true);
  });

  it("should say valid: false for simple or check", () => {
    const query: ScopeQuery = {
      or: ["a", "b"],
    };

    const result = check(query, ["c"]);

    expect(result.valid).toBe(false);
  });

  it("should say handle complex and/or check", () => {
    const query: ScopeQuery = {
      or: [
        {
          and: [
            "a",
            "b",
            {
              or: ["c", "d"],
            },
          ],
        },
        {
          or: [
            "e",
            "f",
            {
              and: ["g", "h"],
            },
          ],
        },
      ],
    };

    const result1 = check(query, ["a", "b", "c"]);
    expect(result1.valid).toBe(true);

    const result2 = check(query, ["a", "b", "h"]);
    expect(result2.valid).toBe(false);

    const result3 = check(query, ["a", "b", "e"]);
    expect(result3.valid).toBe(true);
  });
});
