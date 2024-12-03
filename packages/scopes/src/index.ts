import { z } from "zod";

export type ScopeQuery<Role extends string = string> =
  | Role
  | {
      and: ScopeQuery<Role>[];
      or?: never;
    }
  | {
      and?: never;
      or: ScopeQuery<Role>[];
    };

export const scopeQuerySchema: z.ZodType<ScopeQuery> = z.union([
  z.string(),
  z.object({
    and: z.array(z.lazy(() => scopeQuerySchema)),
  }),
  z.object({
    or: z.array(z.lazy(() => scopeQuerySchema)),
  }),
]);

export function check(
  query: ScopeQuery,
  scopes: string[]
): { valid: true } | { valid: false; message: string } {
  if (typeof query === "string") {
    // Check if the scope is in the list of scopes
    if (scopes.includes(query)) {
      return { valid: true };
    }
    return {
      valid: false,
      message: `Scope list of scopes does not contain the scope "${query}"`,
    };
  }

  if (query.and) {
    const results = query.and.map((q) => check(q, scopes));
    for (const r of results) {
      if (!r.valid) {
        return r;
      }
    }
    return { valid: true };
  }

  if (query.or) {
    for (const q of query.or) {
      const r = check(q, scopes);
      if (r.valid) {
        return r;
      }
    }
    return {
      valid: false,
      message:
        "Scope check failed because at least one necessary scope is missing.",
    };
  }

  return {
    valid: false,
    message: "Reached end of scope check without a match",
  };
}
