import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  addMemberToWorkspace,
  createWorkspace,
} from "@/server/data/workspaces";
import { getKeyManagementService } from "@/server/key-management";
import { uid } from "@optra/core/uid";
import { setActiveWorkspaceId } from "@/server/data/users";

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

      const tenantId = uid();

      const workspace = await createWorkspace({
        name: input.name,
        tenantId,
        type: "paid",
        dataEncryptionKeyId: dek.keyId,
        createdAt: now,
        updatedAt: now,
      });

      const addMemberResult = await addMemberToWorkspace(
        workspace.id,
        ctx.user.id,
      );

      if (!addMemberResult.success) throw new Error("Failed to add member");

      await setActiveWorkspaceId(ctx.user.id, tenantId);

      console.log(`active workspace id for user ${ctx.user.id} is ${tenantId}`);

      return {
        workspaceId: workspace.id,
        memberId: addMemberResult.memberId,
      };
    }),
});
