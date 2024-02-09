import { describe, expect, it } from "vitest";
import { PermissionQuery, RBAC } from ".";

describe("RBAC permissions check tests", () => {
  it("should say valid: true for simple and check", () => {
    const rbac = new RBAC();

    const query: PermissionQuery = {
      and: ["a", "b"],
    };

    const result = rbac.check(query, ["a", "b"]);

    expect(result.valid).toBe(true);
  });

  it("should say valid: false for simple and check", () => {
    const rbac = new RBAC();

    const query: PermissionQuery = {
      and: ["a", "b"],
    };

    const result = rbac.check(query, ["a"]);

    expect(result.valid).toBe(false);
  });

  it("should say valid: true for simple or check", () => {
    const rbac = new RBAC();

    const query: PermissionQuery = {
      or: ["a", "b"],
    };

    const result = rbac.check(query, ["a"]);

    expect(result.valid).toBe(true);
  });

  it("should say valid: false for simple or check", () => {
    const rbac = new RBAC();

    const query: PermissionQuery = {
      or: ["a", "b"],
    };

    const result = rbac.check(query, ["c"]);

    expect(result.valid).toBe(false);
  });

  it("should say handle complex and/or check", () => {
    const rbac = new RBAC();

    const query: PermissionQuery = {
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

    const result1 = rbac.check(query, ["a", "b", "c"]);
    expect(result1.valid).toBe(true);

    const result2 = rbac.check(query, ["a", "b", "h"]);
    expect(result2.valid).toBe(false);

    const result3 = rbac.check(query, ["a", "b", "e"]);
    expect(result3.valid).toBe(true);
  });
});
