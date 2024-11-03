import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  addMemberToWorkspace,
  createWorkspace,
} from "@/server/data/workspaces";
import { getKeyManagementService } from "@/server/key-management";

export const workspaceRouter = createTRPCRouter({
  createPaidWorkspace: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const keyManagementService = await getKeyManagementService();

      const dek = await keyManagementService.createDataKey();

      const now = new Date();

      const workspace = await createWorkspace({
        name: input.name,
        tenantId: ctx.tenant.id,
        type: "paid",
        dataEncryptionKeyId: dek.keyId,
        createdAt: now,
        updatedAt: now,
      });

      const addMemberResult = await addMemberToWorkspace(
        workspace.id,
        ctx.tenant.id,
      );

      if (!addMemberResult.success) throw new Error("Failed to add member");

      return {
        workspaceId: workspace.id,
        memberId: addMemberResult.memberId,
      };
    }),
});
