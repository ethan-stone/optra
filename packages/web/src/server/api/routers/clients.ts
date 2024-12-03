import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

import {
  getApiByWorkspaceIdAndApiId,
  getScopesForApi,
} from "@/server/data/apis";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import {
  createBasicClient,
  deleteClientById,
  getClientByWorkspaceIdAndClientId,
  setClientScopes,
  updateClientById,
} from "@/server/data/clients";
import { rotateClientSecretForClient } from "../../data/clients";

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

      const res = await createBasicClient({
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
  updateClient: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string() }))
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

      await updateClientById(input.id, { name: input.name });

      return null;
    }),
  setScopes: protectedProcedure
    .input(z.object({ id: z.string(), scopes: z.array(z.string()) }))
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

      await setClientScopes(input.id, workspace.id, input.scopes);

      return null;
    }),
  rotateClientSecret: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        expiresAt: z
          .string()
          .datetime()
          .nullish()
          .refine(
            (value) => {
              if (value === null || value === undefined) return true;
              const date = new Date(value);
              return date > new Date();
            },
            { message: "Expires at must be in the future" },
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

      const newSecret = await rotateClientSecretForClient(
        input.id,
        input.expiresAt ? new Date(input.expiresAt) : undefined,
      );

      return newSecret;
    }),
});
