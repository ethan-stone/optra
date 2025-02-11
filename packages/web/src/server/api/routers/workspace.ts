import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  cancelPlanChange,
  changePlan,
  createWorkspace,
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

      const org = await ctx.clerk.organizations.createOrganization({
        name: input.name,
        createdBy: ctx.user.id,
      });

      const workspace = await createWorkspace({
        name: input.name,
        tenantId: org.id,
        type: "paid",
        dataEncryptionKeyId: dek.keyId,
        createdAt: now,
        updatedAt: now,
      });

      console.log(`active workspace id for user ${ctx.user.id} is ${tenantId}`);

      return {
        workspaceId: workspace.id,
        tenantId: org.id,
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

    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer_email: ctx.user.email,
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
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["org:admin", "org:developer", "org:member"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const workspace = await getWorkspaceByTenantId(ctx.tenant.id);

      if (!workspace)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });

      if (ctx.user.role !== "org:admin" && ctx.user.role !== "org:developer") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can invite members",
        });
      }

      await ctx.clerk.organizations.createOrganizationInvitation({
        emailAddress: input.email,
        organizationId: workspace.tenantId,
        inviterUserId: ctx.user.id,
        role: input.role,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invites/accept`,
      });
    }),
});
