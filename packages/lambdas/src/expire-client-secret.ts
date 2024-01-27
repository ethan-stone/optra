import { eq } from "drizzle-orm";
import { db } from "./db";
import * as schema from "@optra/db/schema";

export type ExpireClientSecretArgs = {
  clientId: string;
  clientSecretId: string;
};

export async function expireClientSecret(
  args: ExpireClientSecretArgs
): Promise<void> {
  const { clientId, clientSecretId } = args;

  await db.transaction(async (tx) => {
    const client = await tx.query.clients.findFirst({
      where: (table, { and, eq, isNull }) =>
        and(
          eq(table.currentClientSecretId, clientSecretId),
          eq(table.id, clientId),
          isNull(table.deletedAt)
        ),
    });

    if (!client) {
      throw new Error(
        `Could not find client ${clientId} with secret ${clientSecretId}`
      );
    }

    if (!client.nextClientSecretId) {
      throw new Error(`Client ${client.id} does not have a nextClientSecretId`);
    }

    await tx
      .update(schema.clients)
      .set({
        currentClientSecretId: client.nextClientSecretId,
        nextClientSecretId: null,
      })
      .where(eq(schema.clients.id, client.id));

    await tx
      .update(schema.clientSecrets)
      .set({
        status: "revoked",
        deletedAt: new Date(),
      })
      .where(eq(schema.clientSecrets.id, clientSecretId));

    console.log(`Revoked client secret ${clientSecretId}`);
  });
}
