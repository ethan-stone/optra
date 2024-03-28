import { schema } from "@optra/db";
import { db } from "../db";
import { uid } from "@/utils/uid";
import { hashSHA256 } from "@/utils/hash";

export async function getTotalClientsForApi(apiId: string) {
  const clients = await db.query.clients.findMany({
    where: (table, { eq }) => eq(table.apiId, apiId),
  });

  return clients.length;
}

export async function getClientsByApi(apiId: string) {
  return db.query.clients.findMany({
    where: (table, { eq }) => eq(table.apiId, apiId),
  });
}

type CreateClientArgs = {
  apiId: string;
  workspaceId: string;
  name: string;
  clientIdPrefix?: string;
  clientSecretPrefix?: string;
};

export async function createClient(args: CreateClientArgs) {
  const clientId = args.clientIdPrefix
    ? `${args.clientIdPrefix}_${uid()}`
    : uid("client");

  const clientSecret = args.clientSecretPrefix
    ? `${args.clientSecretPrefix}_${uid()}`
    : uid();

  const hashedSecret = hashSHA256(clientSecret);

  const clientSecretId = uid("ssk");

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(schema.clientSecrets).values({
      id: clientSecretId,
      secret: hashedSecret,
      status: "active",
      createdAt: now,
    });

    await tx.insert(schema.clients).values({
      id: clientId,
      clientIdPrefix: args.clientIdPrefix,
      clientSecretPrefix: args.clientSecretPrefix,
      apiId: args.apiId,
      currentClientSecretId: clientSecretId,
      name: args.name,
      workspaceId: args.workspaceId,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  });

  return {
    clientId,
    clientSecret,
  };
}
