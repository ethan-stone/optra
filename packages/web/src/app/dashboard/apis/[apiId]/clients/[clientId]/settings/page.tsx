import { notFound, redirect } from "next/navigation";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getClientByWorkspaceIdAndClientId } from "@/server/data/clients";
import { getTenantId } from "@/utils/auth";
import { EditClientForm } from "./edit-client-form";
import { getApiByWorkspaceIdAndApiId } from "@/server/data/apis";
import { ClientSecrets } from "./client-secrets";
import { Separator } from "@/components/ui/separator";

type ClientPageProps = {
  params: { apiId: string; clientId: string };
};

export default async function EditClientPage({ params }: ClientPageProps) {
  const tenantId = await getTenantId();

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-row items-center justify-between">
        <h2 className="text-2xl font-semibold">{client.name}</h2>
      </div>
      <EditClientForm
        clientId={client.id}
        clientName={client.name}
        apiId={api.id}
        apiScopes={api.scopes}
        clientScopes={client.scopes}
      />
      <Separator />
      <ClientSecrets
        clientId={client.id}
        currentClientSecret={client.currentClientSecret}
        nextClientSecret={client.nextClientSecret}
      />
    </div>
  );
}
