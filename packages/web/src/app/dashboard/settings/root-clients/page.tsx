import { getTenantId } from "@/utils/auth";
import { notFound } from "next/navigation";
import { RootClients } from "../root-clients";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getRootClientsForWorkspace } from "@/server/data/clients";

export default async function RootClientsPage() {
  const tenantId = getTenantId();

  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    return notFound();
  }

  const rootClients = await getRootClientsForWorkspace(workspace.id);

  return (
    <div className="flex flex-col">
      <RootClients
        data={rootClients.map((r) => ({
          id: r.id,
          name: r.name,
        }))}
      />
    </div>
  );
}
