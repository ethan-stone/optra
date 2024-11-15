import { getVerificationsGroupedByDay } from "@/server/data/analytics";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { TRPCError } from "@trpc/server";

export const analyticsRouter = createTRPCRouter({
  getVerificationsGroupedByDay: protectedProcedure
    .input(
      z.object({
        apiId: z.string().optional(),
        clientId: z.string().optional(),
        timestampGt: z.date(),
        timestampLt: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const workspace = await getWorkspaceByTenantId(ctx.tenant.id);

      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      return getVerificationsGroupedByDay({
        workspaceId: workspace.id,
        apiId: input.apiId,
        clientId: input.clientId,
        timestampGt: input.timestampGt,
        timestampLt: input.timestampLt,
      });
    }),
});
