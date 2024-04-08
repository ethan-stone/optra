import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { env } from "@/env";
import { TRPCError } from "@trpc/server";
import { uid } from "@/utils/uid";
import { schema } from "@optra/db";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import {
  getApiByWorkspaceIdAndApiId,
  getScopesForApi,
} from "@/server/data/apis";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import {
  createClient,
  deleteClientById,
  getClientByWorkspaceIdAndClientId,
} from "@/server/data/clients";

function getStringSizeInBytes(str: string): number {
  let sizeInBytes = 0;
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    if (charCode < 0x80) {
      sizeInBytes += 1;
    } else if (charCode < 0x800) {
      sizeInBytes += 2;
    } else if (charCode < 0xd800 || charCode >= 0xe000) {
      sizeInBytes += 3;
    } else {
      // Surrogate pair
      i++;
      sizeInBytes += 4;
    }
  }
  return sizeInBytes;
}

export const clientsRouter = createTRPCRouter({
  createRootClient: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const optraApi = await ctx.db.query.apis.findFirst({
        where: (table, { eq }) => eq(table.id, env.OPTRA_API_ID),
        with: {
          workspace: true,
        },
      });

      if (!optraApi) {
        console.error(`Optra API not found`);
        // throw internal server error because this means something
        // is very wrong with the configuration
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      const workspace = await ctx.db.query.workspaces.findFirst({
        where: (table, { eq }) => eq(table.tenantId, ctx.tenant.id),
      });

      if (!workspace) {
        console.error(`Workspace not found for tenant ${ctx.tenant.id}`);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      const clientId = "optra_" + uid();
      const clientSecretId = uid("csk");
      const clientSecretValue = "optra_sk_" + uid();
      const clientSecretHash = createHash("sha256")
        .update(clientSecretValue)
        .digest("hex");

      await ctx.db.transaction(async (tx) => {
        const now = new Date();

        await tx.insert(schema.clientSecrets).values({
          id: clientSecretId,
          secret: clientSecretHash,
          status: "active",
          createdAt: now,
        });

        await tx.insert(schema.clients).values({
          id: clientId,
          name: input.name,
          apiId: optraApi.id,
          version: 1,
          workspaceId: env.OPTRA_WORKSPACE_ID,
          forWorkspaceId: workspace.id,
          currentClientSecretId: clientSecretId,
          // rate limit for root clients is ~10 requests per second
          rateLimitBucketSize: 10,
          rateLimitRefillAmount: 10,
          rateLimitRefillInterval: 1000,
          createdAt: now,
          updatedAt: now,
        });
      });

      return {
        clientId: clientId,
        clientSecret: clientSecretValue,
      };
    }),
  deleteRootClient: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const optraApi = await ctx.db.query.apis.findFirst({
        where: (table, { eq }) => eq(table.id, env.OPTRA_API_ID),
        with: {
          workspace: true,
        },
      });

      if (!optraApi) {
        console.error(`Optra API not found`);
        // throw internal server error because this means something
        // is very wrong with the configuration
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      const workspace = await ctx.db.query.workspaces.findFirst({
        where: (table, { eq }) => eq(table.tenantId, ctx.tenant.id),
      });

      if (!workspace) {
        console.error(`Workspace not found for tenant ${ctx.tenant.id}`);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      const client = await ctx.db.query.clients.findFirst({
        where: (table, { eq, and }) =>
          and(eq(table.id, input.id), eq(table.forWorkspaceId, workspace.id)),
      });

      if (!client) {
        console.warn(
          `Client with id ${input.id} does not exist or is not a part of workspace ${workspace.id}`,
        );
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Could not found the client.",
        });
      }

      await ctx.db
        .update(schema.clients)
        .set({
          deletedAt: new Date(),
        })
        .where(eq(schema.clients.id, input.id));
    }),
  createClient: protectedProcedure
    .input(
      z.object({
        apiId: z.string(),
        name: z.string().min(1),
        scopes: z.array(z.string()).optional(),
        clientIdPrefix: z.string().optional(),
        clientSecretPrefix: z.string().optional(),
        metadata: z
          .record(z.unknown())
          .optional()
          .refine(
            (value) => {
              if (value === undefined) return true;
              const stringified = JSON.stringify(value);
              const sizeInBytes = getStringSizeInBytes(stringified);
              return sizeInBytes <= 1024;
            },
            { message: "Metadata size can not be larger than 1KB" },
          ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const workspace = await getWorkspaceByTenantId(ctx.tenant.id);

      if (!workspace) {
        console.error(`Workspace not found for tenant ${ctx.tenant.id}`);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      const api = await getApiByWorkspaceIdAndApiId(workspace.id, input.apiId);

      if (!api) {
        console.error(
          `API not found for workspace ${workspace.id} and api ${input.apiId}`,
        );
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API not found",
        });
      }

      const scopes = await getScopesForApi(api.id);

      const matchingScopes = scopes.filter((s) =>
        input.scopes ? input.scopes.includes(s.name) : false,
      );

      const res = await createClient({
        apiId: api.id,
        workspaceId: workspace.id,
        name: input.name,
        clientIdPrefix: input.clientIdPrefix,
        clientSecretPrefix: input.clientSecretPrefix,
        scopes: matchingScopes.map((s) => s.id),
        metadata: input.metadata,
      });

      return {
        clientId: res.clientId,
        clientSecret: res.clientSecret,
      };
    }),
  deleteClient: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await getWorkspaceByTenantId(ctx.tenant.id);

      if (!workspace) {
        console.error(`Workspace not found for tenant ${ctx.tenant.id}`);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      const client = await getClientByWorkspaceIdAndClientId(
        workspace.id,
        input.id,
      );

      if (!client) {
        console.warn(
          `Client with id ${input.id} does not exist or is not a part of workspace ${workspace.id}`,
        );
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Could not found the client.",
        });
      }

      await deleteClientById(input.id);

      return null;
    }),
});
