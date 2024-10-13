import { notFound, redirect } from "next/navigation";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getClientByWorkspaceIdAndClientId } from "@/server/data/clients";
import { getTenantId } from "@/utils/auth";
import { EditClientForm } from "./edit-client-form";
import { getApiByWorkspaceIdAndApiId } from "@/server/data/apis";

type ClientPageProps = {
  params: { apiId: string; clientId: string };
};

export default async function EditClientPage({ params }: ClientPageProps) {
  const tenantId = getTenantId();

  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    return redirect("/onboarding");
  }

  const client = await getClientByWorkspaceIdAndClientId(
    workspace.id,
    params.clientId,
  );

  if (!client) {
    return notFound();
  }

  const api = await getApiByWorkspaceIdAndApiId(workspace.id, params.apiId);

  if (!api) {
    return notFound();
  }

  return (
    <div>
      <div className="mb-6 flex flex-row items-center justify-between">
        <h2 className="text-2xl font-semibold">{client.name}</h2>
      </div>
      <EditClientForm
        clientId={client.id}
        clientName={client.name}
        apiId={api.id}
        apiScopes={api.scopes}
        clientScopes={client.scopes}
      />
    </div>
  );
}
