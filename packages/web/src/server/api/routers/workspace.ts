import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  addMemberToWorkspace,
  cancelPlanChange,
  changePlan,
  createWorkspace,
  createWorkspaceInvite,
  getAccessibleWorkspaces,
  getWorkspaceById,
  getWorkspaceByTenantId,
  requestPlanChange,
} from "@/server/data/workspaces";
import { getKeyManagementService } from "@/server/key-management";
import { uid } from "@optra/core/uid";
import { setActiveWorkspaceId } from "@/server/data/users";
import { TRPCError } from "@trpc/server";
import { Resource } from "sst";
import Stripe from "stripe";
import { createServerClient } from "@/server/supabase/server-client";
import { getEmailService } from "@/server/email";
import { renderMemberInviteEmail } from "@optra/core/email";

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

    const workspace = await getWorkspaceByTenantId(ctx.tenant.id);

    if (!workspace)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Workspace not found",
      });

    if (workspace.billingInfo) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Workspace already has a billing info",
      });
    }

    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer_email: user.email,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing/success?session_id={CHECKOUT_SESSION_ID}&plan=${"pro"}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`,
      billing_address_collection: "auto",
      currency: "usd",
      customer_creation: "always",
      client_reference_id: workspace.id,
    });

    if (!session.url)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create checkout session",
      });

    return {
      url: session.url,
    };
  }),
  changePlan: protectedProcedure
    .input(z.object({ plan: z.enum(["free", "pro"]) }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await getWorkspaceByTenantId(ctx.tenant.id);

      if (!workspace)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });

      if (!workspace.billingInfo)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Workspace must have billing info to change plan.",
        });

      const currentPlan = workspace.billingInfo.plan;

      if (currentPlan === input.plan) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Workspace is already on this plan.",
        });
      }

      // can upgrade from free to a paid plan immediately
      // the monthly fee will be prorated for the remaining days of the month
      if (currentPlan === "free" && input.plan === "pro") {
        await changePlan(workspace.id, "pro");

        return {
          status: "plan_changed",
        };
      }

      // if we're on a paid plan, pro or enterprise, we can request a plan change
      // which will be applied on the next billing date
      await requestPlanChange(workspace.id, input.plan);

      return {
        status: "plan_change_requested",
      };
    }),
  cancelPlanChange: protectedProcedure.mutation(async ({ ctx }) => {
    const workspace = await getWorkspaceByTenantId(ctx.tenant.id);

    if (!workspace)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Workspace not found",
      });

    if (!workspace.billingInfo)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Workspace must have billing info to change plan.",
      });

    await cancelPlanChange(workspace.id);
  }),
  inviteMember: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await getWorkspaceByTenantId(ctx.tenant.id);
      const emailService = await getEmailService();

      if (!workspace)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });

      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can invite members",
        });
      }

      const invite = await createWorkspaceInvite(workspace.id, input.email);

      const content = await renderMemberInviteEmail({
        workspaceName: workspace.name,
        inviteLink: `${process.env.NEXT_PUBLIC_APP_URL}/invites/${invite.slug}/accept`,
        invitedByEmail: ctx.user.email,
      });

      await emailService.sendEmail({
        to: [input.email],
        subject: `You've been invited to join ${workspace.name} on Optra`,
        body: content,
      });
    }),
});
