import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { storageBucket } from "@/server/storage-bucket";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import {
  addScopeToApi,
  createApi,
  deleteApi,
  deleteApiScopeById,
  getApiByWorkspaceIdAndApiId,
  getApiScopeById,
  rotateSigningSecretForApi,
  updateApiById,
} from "@/server/data/apis";
import { getKeyManagementService } from "@/server/key-management";

export const apisRouter = createTRPCRouter({
  createApi: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        algorithm: z.enum(["hsa256", "rsa256"]).default("rsa256"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const keyManagementService = await getKeyManagementService();

      const workspace = await getWorkspaceByTenantId(ctx.tenant.id);

      if (!workspace) {
        console.error(`Workspace not found for tenant ${ctx.tenant.id}`);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      if (input.algorithm === "hsa256") {
        const signingSecret = await crypto.subtle.generateKey(
          {
            name: "HMAC",
            hash: { name: "SHA-256" },
          },
          true,
          ["sign", "verify"],
        );

        const exportedSigningSecret = Buffer.from(
          await crypto.subtle.exportKey("raw", signingSecret),
        ).toString("base64");

        const encryptResult = await keyManagementService.encryptWithDataKey(
          workspace.dataEncryptionKeyId,
          Buffer.from(exportedSigningSecret, "base64"),
        );

        const now = new Date();

        const { id } = await createApi({
          workspaceId: workspace.id,
          name: input.name,
          scopes: [],
          algorithm: "hsa256",
          encryptedSigningSecret: Buffer.from(
            encryptResult.encryptedData,
          ).toString("base64"),
          iv: Buffer.from(encryptResult.iv).toString("base64"),
          tokenExpirationInSeconds: 86400,
          createdAt: now,
          updatedAt: now,
        });

        return { id };
      } else if (input.algorithm === "rsa256") {
        const keyPair = await crypto.subtle.generateKey(
          {
            name: "RSASSA-PKCS1-v1_5",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: { name: "SHA-256" },
          },
          true,
          ["sign", "verify"],
        );

        const publicKey = await crypto.subtle.exportKey(
          "jwk",
          keyPair.publicKey,
        );
        const privateKey = await crypto.subtle.exportKey(
          "pkcs8",
          keyPair.privateKey,
        );

        const encryptResult = await keyManagementService.encryptWithDataKey(
          workspace.dataEncryptionKeyId,
          Buffer.from(privateKey),
        );

        const now = new Date();

        const { id, currentSigningSecretId } = await createApi({
          workspaceId: workspace.id,
          name: input.name,
          scopes: [],
          algorithm: "rsa256",
          encryptedSigningSecret: Buffer.from(
            encryptResult.encryptedData,
          ).toString("base64"),
          iv: Buffer.from(encryptResult.iv).toString("base64"),
          tokenExpirationInSeconds: 86400,
          createdAt: now,
          updatedAt: now,
        });

        await storageBucket.upload({
          contentType: "application/json",
          key: `jwks/${workspace.id}/${id}/.well-known/jwks.json`,
          body: JSON.stringify({
            keys: [
              {
                ...publicKey,
                kid: currentSigningSecretId,
              },
            ],
          }),
        });

        return {
          id,
        };
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid algorithm",
        });
      }
    }),
  updateApi: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        tokenExpirationInSeconds: z.number().int().min(0),
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

      const api = await getApiByWorkspaceIdAndApiId(workspace.id, input.id);

      if (!api) {
        console.error(`API not found for workspace ${workspace.id}`);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API not found",
        });
      }

      await updateApiById(input.id, {
        tokenExpirationInSeconds: input.tokenExpirationInSeconds,
        name: input.name,
      });
    }),
  deleteApi: protectedProcedure
    .input(
      z.object({
        id: z.string(),
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

      const api = await getApiByWorkspaceIdAndApiId(workspace.id, input.id);

      if (!api) {
        console.error(`API not found for workspace ${workspace.id}`);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API not found",
        });
      }

      await deleteApi(input.id);
    }),
  addScope: protectedProcedure
    .input(
      z.object({
        apiId: z.string(),
        name: z.string(),
        description: z.string(),
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
        console.error(`Api not found for id ${input.apiId}`);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      const { id } = await addScopeToApi({
        apiId: input.apiId,
        name: input.name,
        description: input.description,
      });

      return { id };
    }),
  deleteScope: protectedProcedure
    .input(
      z.object({
        id: z.string(),
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

      const scope = await getApiScopeById(input.id);

      if (!scope) {
        console.error(`Scope not found for ID ${input.id}`);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Scope not found",
        });
      }

      const api = await getApiByWorkspaceIdAndApiId(workspace.id, scope.apiId);

      if (!api) {
        console.warn(`Requester does not have access to API ${scope.apiId}`);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Scope not found",
        });
      }

      await deleteApiScopeById(input.id);

      return null;
    }),
  rotateSigningSecret: protectedProcedure
    .input(
      z.object({
        apiId: z.string(),
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
      const keyManagementService = await getKeyManagementService();

      if (!workspace) {
        console.error(`Workspace not found for tenant ${ctx.tenant.id}`);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      const api = await getApiByWorkspaceIdAndApiId(workspace.id, input.apiId);

      if (!api) {
        console.error(`API not found for id ${input.apiId}`);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API not found",
        });
      }

      if (api.currentSigningSecret.algorithm === "hsa256") {
        const signingSecret = await crypto.subtle.generateKey(
          {
            name: "HMAC",
            hash: { name: "SHA-256" },
          },
          true,
          ["sign", "verify"],
        );

        const exportedSigningSecret = Buffer.from(
          await crypto.subtle.exportKey("raw", signingSecret),
        ).toString("base64");

        const encryptResult = await keyManagementService.encryptWithDataKey(
          workspace.dataEncryptionKeyId,
          Buffer.from(exportedSigningSecret, "base64"),
        );

        await rotateSigningSecretForApi({
          apiId: input.apiId,
          algorithm: "hsa256",
          encryptedSigningSecret: Buffer.from(
            encryptResult.encryptedData,
          ).toString("base64"),
          iv: Buffer.from(encryptResult.iv).toString("base64"),
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        });
      } else if (api.currentSigningSecret.algorithm === "rsa256") {
        const keyPair = await crypto.subtle.generateKey(
          {
            name: "RSASSA-PKCS1-v1_5",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: { name: "SHA-256" },
          },
          true,
          ["sign", "verify"],
        );

        const publicKey = await crypto.subtle.exportKey(
          "jwk",
          keyPair.publicKey,
        );
        const privateKey = await crypto.subtle.exportKey(
          "pkcs8",
          keyPair.privateKey,
        );

        const encryptResult = await keyManagementService.encryptWithDataKey(
          workspace.dataEncryptionKeyId,
          Buffer.from(privateKey),
        );

        const { id: newSigningSecretId } = await rotateSigningSecretForApi({
          apiId: input.apiId,
          algorithm: "rsa256",
          encryptedSigningSecret: Buffer.from(
            encryptResult.encryptedData,
          ).toString("base64"),
          iv: Buffer.from(encryptResult.iv).toString("base64"),
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        });

        const url = `${storageBucket.publicUrl}/jwks/${workspace.id}/${api.id}/.well-known/jwks.json`;

        const res = await fetch(url, {
          method: "GET",
        });

        if (!res.ok) {
          throw new Error(`Failed to get JWKS from ${url}`);
        }

        const jwks = JSON.parse(await res.text()) as {
          keys: (JsonWebKey & { kid: string })[];
        };

        jwks.keys.push({
          ...publicKey,
          kid: newSigningSecretId,
        });

        await storageBucket.upload({
          contentType: "application/json",
          key: `jwks/${workspace.id}/${api.id}/.well-known/jwks.json`,
          body: JSON.stringify(jwks),
        });
      }

      return { success: true };
    }),
});
