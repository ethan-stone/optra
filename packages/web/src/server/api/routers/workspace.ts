import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  addMemberToWorkspace,
  createWorkspace,
  getAccessibleWorkspaces,
  getWorkspaceById,
} from "@/server/data/workspaces";
import { getKeyManagementService } from "@/server/key-management";
import { uid } from "@optra/core/uid";
import { setActiveWorkspaceId } from "@/server/data/users";
import { TRPCError } from "@trpc/server";
import { Resource } from "sst";
import Stripe from "stripe";

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

      if (!addMemberResult.success)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add member",
        });

      await setActiveWorkspaceId(ctx.user.id, tenantId);

      console.log(`active workspace id for user ${ctx.user.id} is ${tenantId}`);

      return {
        workspaceId: workspace.id,
        memberId: addMemberResult.memberId,
      };
    }),
  getAccessibleWorkspaces: protectedProcedure.query(async ({ ctx }) => {
    const workspaces = await getAccessibleWorkspaces(ctx.user.id);

    return workspaces;
  }),
  changeActiveWorkspace: protectedProcedure
    .input(z.object({ workspaceId: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      if (!input.workspaceId) {
        await setActiveWorkspaceId(ctx.user.id, null);
        return { success: true };
      }

      const workspace = await getWorkspaceById(input.workspaceId);

      if (!workspace)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });

      const accessibleWorkspaces = await getAccessibleWorkspaces(ctx.user.id);

      const workspaceIsAccessible = accessibleWorkspaces.find(
        (w) => w.id === input.workspaceId,
      );

      if (!workspaceIsAccessible)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not allowed" });

      await setActiveWorkspaceId(ctx.user.id, workspace.tenantId);

      return { success: true };
    }),
  createCheckoutSession: protectedProcedure.mutation(async ({ ctx }) => {
    const stripe = new Stripe(Resource.StripeApiKey.value);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`,
      line_items: [{}],
    });
  }),
});
