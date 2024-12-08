import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getTenantId } from "@/server/auth/utils";
import { redirect } from "next/navigation";

export default async function WorkspaceSettingsPage() {
  const tenantId = await getTenantId();

  if (!tenantId) {
    return redirect("/sign-up");
  }

  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    return redirect("/onboarding");
  }

  return <div>{workspace.id}</div>;
}
