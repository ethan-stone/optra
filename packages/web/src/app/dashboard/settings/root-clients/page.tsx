import { db } from "@/server/db";
import { getTenantId } from "@/utils/auth";
import { notFound } from "next/navigation";
import { RootClients } from "../root-clients";

export default async function RootClientsPage() {
  const tenantId = getTenantId();

  const workspaceId = await db.query.workspaces.findFirst({
    where: (table, { eq }) => eq(table.tenantId, tenantId),
  });

  if (!workspaceId) {
    return notFound();
  }

  const rootClients = await db.query.clients.findMany({
    where: (table, { eq, and, isNull }) =>
      and(eq(table.forWorkspaceId, workspaceId.id), isNull(table.deletedAt)),
  });

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
