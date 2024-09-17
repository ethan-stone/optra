import { getDrizzle } from "@optra/core/drizzle";
import { DrizzleClientRepo } from "@optra/core/clients";
import { env } from "@/env";

async function getClientRepo() {
  const { db } = await getDrizzle(env.DATABASE_URL);
  return new DrizzleClientRepo(db);
}

export async function getTotalClientsForApi(apiId: string) {
  const clients = await getClientRepo();

  const clientArray = await clients.listByApiId(apiId);

  return clientArray.length;
}

export async function getClientsByApi(apiId: string) {
  const clients = await getClientRepo();

  return clients.listByApiId(apiId);
}

type CreateBasicClientArgs = {
  apiId: string;
  workspaceId: string;
  name: string;
  clientIdPrefix?: string;
  clientSecretPrefix?: string;
  scopes?: string[]; // api scope ids
  metadata?: Record<string, unknown>;
};

export async function createBasicClient(args: CreateBasicClientArgs) {
  const clients = await getClientRepo();

  const now = new Date();

  const client = await clients.createBasic({
    clientIdPrefix: args.clientIdPrefix,
    clientSecretPrefix: args.clientSecretPrefix,
    apiId: args.apiId,
    workspaceId: args.workspaceId,
    name: args.name,
    apiScopes: args.scopes,
    metadata: args.metadata,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });

  return {
    clientId: client.id,
    clientSecret: client.secret,
  };
}

export type CreateRootClientArgs = {
  apiId: string;
  forWorkspaceId: string;
  workspaceId: string;
  name: string;
  clientIdPrefix?: string;
  clientSecretPrefix?: string;
  scopes?: string[]; // api scope ids
  metadata?: Record<string, unknown>;
  rateLimitBucketSize?: number;
  rateLimitRefillAmount?: number;
  rateLimitRefillInterval?: number;
};

export async function createRootClient(args: CreateRootClientArgs) {
  const clients = await getClientRepo();

  const client = await clients.createRoot({
    apiId: args.apiId,
    workspaceId: args.workspaceId,
    forWorkspaceId: args.forWorkspaceId,
    name: args.name,
    clientIdPrefix: args.clientIdPrefix,
    clientSecretPrefix: args.clientSecretPrefix,
    metadata: args.metadata,
    version: 1,
    rateLimitBucketSize: args.rateLimitBucketSize,
    rateLimitRefillAmount: args.rateLimitRefillAmount,
    rateLimitRefillInterval: args.rateLimitRefillInterval,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    clientId: client.id,
    clientSecret: client.secret,
  };
}

export async function getClientByWorkspaceIdAndClientId(
  workspaceId: string,
  clientId: string,
) {
  const clients = await getClientRepo();

  const client = await clients.getById(clientId);

  if (!client) {
    return null;
  }

  if (client.workspaceId !== workspaceId) {
    return null;
  }

  return client;
}

export async function deleteClientById(id: string) {
  const clients = await getClientRepo();

  await clients.delete(id);
}

export async function getRootClientsForWorkspace(workspaceId: string) {
  const clients = await getClientRepo();

  return clients.listRootForWorkspace(workspaceId);
}
