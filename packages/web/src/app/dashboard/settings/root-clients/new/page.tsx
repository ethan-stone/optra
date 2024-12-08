import { getApisForWorkspace } from "@/server/data/apis";
import { NewRootClientForm } from "./new-root-client-form";
import { getTenantId } from "@/server/auth/utils";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { redirect } from "next/navigation";

export default async function NewRootClientPage() {
  const tenant = await getTenantId();

  const workspace = await getWorkspaceByTenantId(tenant);

  if (!workspace) {
    return redirect("/sign-up");
  }

  const apis = await getApisForWorkspace(workspace.id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center justify-between">
        <h2 className="text-2xl font-semibold">New Root Client</h2>
      </div>
      <NewRootClientForm
        apis={apis.map((api) => ({ id: api.id, name: api.name }))}
      />
    </div>
  );
}
