import { WorkspaceRepo } from "@optra/core/workspaces";

export type ChangePlanArgs = {
  workspaceId: string;
};

export async function changePlan(
  args: ChangePlanArgs,
  ctx: { workspaceRepo: WorkspaceRepo }
) {
  const { workspaceId } = args;

  const workspace = await ctx.workspaceRepo.getById(workspaceId);

  if (workspace === null) {
    throw new Error(`Workspace ${workspaceId} not found`);
  }

  if (workspace.billingInfo.requestedPlanChangeTo === null) {
    console.log(
      `Skipping change plan message for workspace ${workspaceId} because it has no requested plan change`
    );
    return;
  }

  await ctx.workspaceRepo.changePlan(
    workspaceId,
    workspace.billingInfo.requestedPlanChangeTo
  );

  console.log(
    `Changed plan for workspace ${workspaceId} to ${workspace.billingInfo.requestedPlanChangeTo}`
  );
}
