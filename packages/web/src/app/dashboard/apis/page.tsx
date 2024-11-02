import { getTenantId } from "@/utils/auth";
import { redirect } from "next/navigation";
import { Apis } from "./apis";
import { CreateApi } from "./create-api";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getApisForWorkspace } from "@/server/data/apis";

export default async function ApisPage() {
  const tenantId = await getTenantId();

  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    return redirect("/onboarding");
  }

  const apis = await getApisForWorkspace(workspace.id);

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex w-2/3 flex-col px-10 py-10">
        <div className="flex flex-row justify-between">
          <div>
            <h1 className="flex text-2xl font-semibold">APIs</h1>
            <p className="py-2 text-sm font-light text-stone-500">
              Make APIs that can be consumed from authorized clients
            </p>
          </div>
          <CreateApi />
        </div>
        <Apis
          data={apis.map((a) => ({
            id: a.id,
            name: a.name,
            numClients: a.numClients ?? 0,
            numTokens: a.numTokens ?? 0,
          }))}
        />
      </div>
    </main>
  );
}
