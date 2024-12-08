import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getTenantId } from "@/server/auth/utils";
import { redirect } from "next/navigation";
import { newLogger } from "@/server/logger";

export default async function Dashboard() {
  const logger = newLogger({
    namespace: "/dashboard",
  });

  logger.info("Dashboard page accessed");

  const tenantId = await getTenantId();

  logger.info(`Fetched tenant: ${tenantId}`, { tenantId });

  // TODO: add isNull(deletedAt) to the query once deleting workspaces is implementeds
  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    logger.info(
      `Did not find workspace for tenantId: ${tenantId}. Redirecting to onboarding.`,
      {
        tenantId,
      },
    );

    return redirect("/onboarding");
  }

  logger.info(
    `Found workspace: ${workspace.id} for tenantId: ${tenantId}. Proceeding to dashboard.`,
    {
      workspaceId: workspace.id,
      tenantId,
    },
  );

  return redirect("/dashboard/apis");
}
