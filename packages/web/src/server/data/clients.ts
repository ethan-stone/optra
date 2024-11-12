import { getDrizzle } from "@optra/core/drizzle";
import { type Client, DrizzleClientRepo } from "@optra/core/clients";
import {
  type ClientSecret,
  DrizzleClientSecretRepo,
} from "@optra/core/client-secrets";
import { DrizzleTokenGenerationRepo } from "@optra/core/token-generations";
import { env } from "@/env";
import { getScheduler } from "../scheduler";

async function getClientRepo() {
  const { db } = await getDrizzle(env.DATABASE_URL);
  return new DrizzleClientRepo(db);
}

async function getTokenRepo() {
  const { db } = await getDrizzle(env.DATABASE_URL);
  return new DrizzleTokenGenerationRepo(db);
}

async function getClientSecretRepo() {
  const { db } = await getDrizzle(env.DATABASE_URL);
  return new DrizzleClientSecretRepo(db);
}

export async function getTotalClientsForApi(apiId: string) {
  const clients = await getClientRepo();

  const clientArray = await clients.listByApiId(apiId);

  return clientArray.length;
}

export async function getClientsByApi(apiId: string) {
  const [clients, tokenGenerations] = await Promise.all([
    getClientRepo(),
    getTokenRepo(),
  ]);

  const clientsList = await clients.listByApiId(apiId);

  const now = new Date();

  const tokenGenerationList = await tokenGenerations.getTotalsForClients({
    clientIds: clientsList.map((c) => c.id),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });

  return clientsList.map((client) => {
    const tokenGeneration = tokenGenerationList.find(
      (tokenGeneration) => tokenGeneration.clientId === client.id,
    );

    return {
      ...client,
      numTokens: tokenGeneration?.total ?? 0,
    };
  }) as (Client & { numTokens: number })[];
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
  const [clients, clientSecrets] = await Promise.all([
    getClientRepo(),
    getClientSecretRepo(),
  ]);

  const client = await clients.getById(clientId);

  if (!client) {
    return null;
  }

  if (client.workspaceId !== workspaceId) {
    return null;
  }

  const clientScopes = await clients.getScopesByClientId(client.id);

  const currentSecret = await clientSecrets.getById(
    client.currentClientSecretId,
  );

  if (!currentSecret) {
    throw new Error(
      `currentClientSecretId ${client.currentClientSecretId} not found for client ${client.id}. This should be impossible.`,
    );
  }

  let nextSecret: ClientSecret | null = null;

  if (client.nextClientSecretId !== null) {
    const nextSecretLocal = await clientSecrets.getById(
      client.nextClientSecretId,
    );

    if (!nextSecretLocal) {
      throw new Error(
        `nextClientSecretId ${client.nextClientSecretId} not found for client ${client.id} despite not being null. This should be impossible.`,
      );
    }

    nextSecret = nextSecretLocal;
  }

  return {
    ...client,
    scopes: clientScopes,
    currentClientSecret: currentSecret,
    nextClientSecret: nextSecret,
  };
}

export async function deleteClientById(id: string) {
  const clients = await getClientRepo();

  await clients.delete(id);
}

export async function getRootClientsForWorkspace(workspaceId: string) {
  const clients = await getClientRepo();

  return clients.listRootForWorkspace(workspaceId);
}

export async function updateClientById(id: string, name: string) {
  const clients = await getClientRepo();

  await clients.update(id, { name });
}

export async function setClientScopes(
  id: string,
  workspaceId: string,
  scopes: string[],
) {
  const clients = await getClientRepo();

  await clients.setScopes({
    clientId: id,
    workspaceId: workspaceId,
    apiScopeIds: scopes,
  });
}

export async function rotateClientSecretForClient(
  clientId: string,
  expiresAt?: Date | null,
) {
  const [clients, clientSecrets, scheduler] = await Promise.all([
    getClientRepo(),
    getClientSecretRepo(),
    getScheduler(),
  ]);

  const client = await clients.getById(clientId);

  if (!client) {
    throw new Error(`Client with id ${clientId} not found`);
  }

  const now = new Date();

  // if the provided expiresAt is null, set it to 1 minute from now
  const expiresAtLocal = expiresAt ?? new Date(now.getTime() + 1000 * 60);

  const newSecret = await clientSecrets.rotate({
    clientId,
    expiresAt: expiresAtLocal,
  });

  await scheduler.createOneTimeSchedule({
    at: expiresAtLocal,
    eventType: "client.secret.expired",
    payload: { clientId, clientSecretId: client.currentClientSecretId },
    timestamp: Date.now(),
  });

  return newSecret;
}
