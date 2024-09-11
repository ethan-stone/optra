import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getTenantId } from "@/utils/auth";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const tenantId = getTenantId();

  // TODO: add isNull(deletedAt) to the query once deleting workspaces is implementeds
  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    redirect("/onboarding");
  }

  return redirect("/dashboard/apis");
}
