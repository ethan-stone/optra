import { db } from "../db";

export async function getWorkspaceByTenantId(tenantId: string) {
  return db.query.workspaces.findFirst({
    where: (table, { eq }) => eq(table.tenantId, tenantId),
  });
}
