import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  createRootClient,
  deleteClientById,
  getClientByWorkspaceIdAndClientId,
  setClientScopes,
  updateClientById,
} from "@/server/data/clients";
import { TRPCError } from "@trpc/server";
import {
  getWorkspaceById,
  getWorkspaceByTenantId,
} from "@/server/data/workspaces";
import {
  getApiByWorkspaceIdAndApiId,
  lazyLoadRootClientScopes,
} from "@/server/data/apis";
import { env } from "@/env";

export const rootClientsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        scopes: z.array(
          z.object({ name: z.string(), description: z.string() }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const optraWorkspace = await getWorkspaceById(env.OPTRA_WORKSPACE_ID);

      if (!optraWorkspace) {
        console.error(`Optra workspace not found for tenant ${ctx.tenant.id}`);
        // throw internal server error because this means something
        // is very wrong with the configuration
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      const optraApi = await getApiByWorkspaceIdAndApiId(
        optraWorkspace.id,
        env.OPTRA_API_ID,
      );

      if (!optraApi) {
        console.error(`Optra API not found`);
        // throw internal server error because this means something
        // is very wrong with the configuration
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      const workspace = await getWorkspaceByTenantId(ctx.tenant.id);

      if (!workspace) {
        console.error(`Workspace not found for tenant ${ctx.tenant.id}`);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      const scopes = await lazyLoadRootClientScopes(
        optraApi.id,
        optraWorkspace.id,
        input.scopes,
      );

      const client = await createRootClient({
        workspaceId: optraWorkspace.id,
        apiId: optraApi.id,
        forWorkspaceId: workspace.id,
        name: input.name,
        clientIdPrefix: "optra",
        clientSecretPrefix: "optra_sk",
        scopes: scopes.map((scope) => scope.id),
        // rate limit for root clients is ~10 requests per second
        rateLimitBucketSize: 10,
        rateLimitRefillAmount: 10,
        rateLimitRefillInterval: 1000,
      });

      return {
        clientId: client.clientId,
        clientSecret: client.clientSecret,
      };
    }),
  update: protectedProcedure
    .input(
      z.object({
        rootClientId: z.string(),
        name: z.string(),
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

      const rootClient = await getClientByWorkspaceIdAndClientId(
        env.OPTRA_WORKSPACE_ID,
        input.rootClientId,
      );

      if (!rootClient || rootClient.forWorkspaceId !== workspace.id) {
        console.warn(
          `Root client with id ${input.rootClientId} does not exist or is not a part of workspace ${workspace.id}`,
        );
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Root client not found",
        });
      }

      await updateClientById(rootClient.id, {
        name: input.name,
      });
    }),
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const optraWorkspace = await getWorkspaceById(env.OPTRA_WORKSPACE_ID);

      if (!optraWorkspace) {
        console.error(`Optra workspace not found for tenant ${ctx.tenant.id}`);
        // throw internal server error because this means something
        // is very wrong with the configuration
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
        });
      }
      const optraApi = await getApiByWorkspaceIdAndApiId(
        optraWorkspace.id,
        env.OPTRA_API_ID,
      );

      if (!optraApi) {
        console.error(`Optra API not found`);
        // throw internal server error because this means something
        // is very wrong with the configuration
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      const workspace = await getWorkspaceByTenantId(ctx.tenant.id);

      if (!workspace) {
        console.error(`Workspace not found for tenant ${ctx.tenant.id}`);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      const client = await getClientByWorkspaceIdAndClientId(
        optraWorkspace.id,
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

      if (client.forWorkspaceId !== workspace.id) {
        console.warn(
          `Client with id ${input.id} does not exist or is not a part of workspace ${workspace.id}`,
        );
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Could not found the client.",
        });
      }

      await deleteClientById(input.id);
    }),
  setScopes: protectedProcedure
    .input(
      z.object({
        rootClientId: z.string(),
        scopes: z.array(
          z.object({ name: z.string(), description: z.string() }),
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

      const rootClient = await getClientByWorkspaceIdAndClientId(
        env.OPTRA_WORKSPACE_ID,
        input.rootClientId,
      );

      if (!rootClient || rootClient.forWorkspaceId !== workspace.id) {
        console.warn(
          `Root client with id ${input.rootClientId} does not exist or is not a part of workspace ${workspace.id}`,
        );
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Root client not found",
        });
      }

      const scopes = await lazyLoadRootClientScopes(
        env.OPTRA_API_ID,
        env.OPTRA_WORKSPACE_ID,
        input.scopes,
      );

      await setClientScopes(
        rootClient.id,
        env.OPTRA_WORKSPACE_ID,
        scopes.map((scope) => scope.id),
      );
    }),
});
