/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { type NextRequest } from "next/server";
import { createServerClient } from "../supabase/server-client";
import { verify } from "jsonwebtoken";
import { Resource } from "sst";
import { z } from "zod";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (req: NextRequest) => {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  let activeWorkspaceId: string | null = null;
  let role: "admin" | "developer" | "viewer" | null = null;

  if (session) {
    const decoded = verify(
      session.access_token,
      Resource.SupabaseJwtSecret.value,
    );

    const parsedDecoded = z
      .object({
        active_workspace_id: z.string().nullable(),
        role: z.enum(["admin", "developer", "viewer"]),
      })
      .parse(decoded);

    activeWorkspaceId = parsedDecoded.active_workspace_id;
    role = parsedDecoded.role;
  }

  return {
    req,
    supabase,
    user: user && role ? { id: user.id, role } : null,
    tenant: activeWorkspaceId
      ? { id: activeWorkspaceId }
      : user
        ? { id: user.id }
        : null,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure;

export const auth = t.middleware(({ next, ctx }) => {
  if (!ctx.user?.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  return next({
    ctx: {
      user: ctx.user,
      tenant: ctx.tenant ?? { id: ctx.user.id },
    },
  });
});

export const protectedProcedure = publicProcedure.use(auth);
