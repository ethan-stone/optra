import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { keyManagementService } from "@/server/key-management";
import { uid } from "@/utils/uid";
import { schema } from "@optra/db";
import { storageBucket } from "@/server/storage-bucket";
import { eq } from "drizzle-orm";

export const apisRouter = createTRPCRouter({
  createApi: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        algorithm: z.enum(["hsa256", "rsa256"]).default("rsa256"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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

        const apiId = uid("api");
        const signingSecretId = uid("ssk");

        await ctx.db.transaction(async (tx) => {
          await tx.insert(schema.signingSecrets).values({
            id: signingSecretId,
            secret: Buffer.from(encryptResult.encryptedData).toString("base64"),
            iv: Buffer.from(encryptResult.iv).toString("base64"),
            algorithm: "hsa256",
            status: "active",
            createdAt: now,
            updatedAt: now,
          });

          await tx.insert(schema.apis).values({
            id: apiId,
            currentSigningSecretId: signingSecretId,
            name: input.name,
            createdAt: now,
            updatedAt: now,
            workspaceId: workspace.id,
          });
        });

        return { id: apiId };
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

        const apiId = uid("api");
        const signingSecretId = uid("ssk");

        await ctx.db.transaction(async (tx) => {
          await tx.insert(schema.signingSecrets).values({
            id: signingSecretId,
            secret: Buffer.from(encryptResult.encryptedData).toString("base64"),
            iv: Buffer.from(encryptResult.iv).toString("base64"),
            algorithm: "rsa256",
            status: "active",
            createdAt: now,
            updatedAt: now,
          });

          await tx.insert(schema.apis).values({
            id: apiId,
            currentSigningSecretId: signingSecretId,
            name: input.name,
            createdAt: now,
            updatedAt: now,
            workspaceId: workspace.id,
          });
        });

        await storageBucket.upload({
          contentType: "application/json",
          key: `${workspace.id}/${apiId}/.well-known/jwks.json`,
          body: JSON.stringify({
            keys: [
              {
                ...publicKey,
                kid: signingSecretId,
              },
            ],
          }),
        });

        return {
          id: apiId,
        };
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid algorithm",
        });
      }
    }),
  deleteApi: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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

      const api = await ctx.db.query.apis.findFirst({
        where: (table, { eq, and }) =>
          and(eq(table.id, input.id), eq(table.workspaceId, workspace.id)),
      });

      if (!api) {
        console.error(`API not found for workspace ${workspace.id}`);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API not found",
        });
      }

      await ctx.db
        .update(schema.apis)
        .set({
          deletedAt: new Date(),
        })
        .where(eq(schema.apis.id, input.id));
    }),
  addScope: protectedProcedure
    .input(
      z.object({
        apiId: z.string(),
        name: z.string(),
        description: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {}),
});
