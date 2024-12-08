import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getTenantId } from "@/server/auth/utils";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const tenantId = await getTenantId();

  // TODO: add isNull(deletedAt) to the query once deleting workspaces is implementeds
  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    redirect("/onboarding");
  }

  return redirect("/dashboard/apis");
}
