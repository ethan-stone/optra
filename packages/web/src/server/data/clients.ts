import { db } from "../db";

export async function getTotalClientsForApi(apiId: string) {
  const clients = await db.query.clients.findMany({
    where: (table, { eq }) => eq(table.apiId, apiId),
  });

  return clients.length;
}
