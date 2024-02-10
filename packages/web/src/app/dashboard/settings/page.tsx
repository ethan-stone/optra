import { db } from "@/server/db";
import { RootClients } from "./root-clients";
import { getTenantId } from "@/utils/auth";
import { notFound } from "next/navigation";

export default async function Settings() {
  const tenantId = getTenantId();

  const workspaceId = await db.query.workspaces.findFirst({
    where: (table, { eq }) => eq(table.tenantId, tenantId),
  });

  if (!workspaceId) {
    return notFound();
  }

  const rootClients = await db.query.clients.findMany({
    where: (table, { eq }) => eq(table.forWorkspaceId, workspaceId.id),
  });

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex w-1/2 flex-col py-10">
        <h1 className="flex text-4xl">Settings</h1>
        <p className="py-2 font-thin">Manage your workspace</p>
        <RootClients
          data={rootClients.map((r) => ({
            id: r.id,
            name: r.name,
          }))}
        />
      </div>
    </main>
  );
}
