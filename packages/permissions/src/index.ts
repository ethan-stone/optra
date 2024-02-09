import { z } from "zod";

export type PermissionQuery<Role extends string = string> =
  | Role
  | {
      and: PermissionQuery<Role>[];
      or?: never;
    }
  | {
      and?: never;
      or: PermissionQuery<Role>[];
    };

export const permissionsQuerySchema: z.ZodType<PermissionQuery> = z.union([
  z.object({
    and: z.array(z.lazy(() => permissionsQuerySchema)),
  }),
  z.object({
    or: z.array(z.lazy(() => permissionsQuerySchema)),
  }),
]);

export class RBAC {
  public check(
    q: PermissionQuery,
    roles: string[]
  ): { valid: true } | { valid: false; message: string } {
    return this._check(q, roles);
  }

  private _check(
    query: PermissionQuery,
    roles: string[]
  ): { valid: true } | { valid: false; message: string } {
    if (typeof query === "string") {
      // Check if the role is in the list of roles
      if (roles.includes(query)) {
        return { valid: true };
      }
      return {
        valid: false,
        message: `Provided list of roles does not contain the role "${query}"`,
      };
    }

    if (query.and) {
      const results = query.and.map((q) => this._check(q, roles));
      for (const r of results) {
        if (!r.valid) {
          return r;
        }
      }
      return { valid: true };
    }

    if (query.or) {
      for (const q of query.or) {
        const r = this._check(q, roles);
        if (r.valid) {
          return r;
        }
      }
      return {
        valid: false,
        message:
          "Permission check failed because at least one necessary role is missing.",
      };
    }

    return {
      valid: false,
      message: "Reached end of permission check without a match",
    };
  }
}
