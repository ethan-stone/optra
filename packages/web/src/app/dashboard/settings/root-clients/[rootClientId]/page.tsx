import { env } from "@/env";
import { getClientByWorkspaceIdAndClientId } from "@/server/data/clients";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getTenantId } from "@/utils/auth";
import { notFound, redirect } from "next/navigation";
import { EditRootClientForm } from "./edit-root-client-form";
import {
  getApisForWorkspace,
  getRootClientScopes,
  lazyLoadRootClientScopes,
} from "@/server/data/apis";
import { apiLevelScopes, workspaceLevelScopes } from "../default-scopes";

type RootClientPageProps = {
  params: { rootClientId: string };
};

export default async function RootClientPage(props: RootClientPageProps) {
  const tenantId = await getTenantId();

  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    return redirect("/onboarding");
  }

  const rootClient = await getClientByWorkspaceIdAndClientId(
    env.OPTRA_WORKSPACE_ID,
    props.params.rootClientId,
  );

  if (!rootClient || rootClient.forWorkspaceId !== workspace.id) {
    return notFound();
  }

  const apis = await getApisForWorkspace(workspace.id);

  const allPossibleApiLevelScopes: {
    name: string;
    description: string;
  }[] = [];

  for (const api of apis) {
    allPossibleApiLevelScopes.push(...apiLevelScopes(api.id));
  }

  // This is the list of scopes that have actually been created
  // in the database for this workspace's APIs.
  const createdScopes = await getRootClientScopes(env.OPTRA_API_ID, [
    ...allPossibleApiLevelScopes,
    ...workspaceLevelScopes,
  ]);

  const scopesThatRootClientHas = rootClient.scopes
    .map((scope) => {
      const createdScope = createdScopes.find(
        (createdScope) => createdScope.id === scope.apiScopeId,
      );
      return createdScope
        ? {
            name: createdScope.name,
          }
        : null;
    })
    .filter(Boolean) as { name: string }[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row items-center justify-between">
        <h2 className="text-2xl font-semibold">{rootClient.name}</h2>
      </div>
      <EditRootClientForm
        rootClient={{
          id: rootClient.id,
          name: rootClient.name,
          scopes: scopesThatRootClientHas,
        }}
        apis={apis.map((api) => ({
          id: api.id,
          name: api.name,
          scopes: apiLevelScopes(api.id),
        }))}
      />
    </div>
  );
}
