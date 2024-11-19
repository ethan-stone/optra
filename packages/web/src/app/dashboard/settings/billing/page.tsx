import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getTenantId } from "@/utils/auth";
import { redirect } from "next/navigation";

export default async function Billing() {
  const tenantId = await getTenantId();

  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    return redirect("/sign-in");
  }

  return (
    <div className="flex flex-col">
      <h1 className="text-2xl font-semibold">Billing</h1>
    </div>
  );
}
