import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getTenantId } from "@/utils/auth";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  console.log("here 7");

  const tenantId = await getTenantId();

  // TODO: add isNull(deletedAt) to the query once deleting workspaces is implementeds
  const workspace = await getWorkspaceByTenantId(tenantId);

  console.log("here 8", workspace?.id);

  if (!workspace) {
    redirect("/onboarding");
  }

  console.log("here 9");

  return redirect("/dashboard/apis");
}
