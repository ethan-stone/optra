import { DrizzleClientRepo } from "@optra/core/clients";
import { DrizzleClientSecretRepo } from "@optra/core/client-secrets";
import { generateJsonObject, generateRandomName } from "./utils";

export async function newClient(
  db: {
    clients: DrizzleClientRepo;
    clientSecrets: DrizzleClientSecretRepo;
  },
  args: {
    workspaceId: string;
    forWorkspaceId?: string;
    apiId: string;
    rateLimitBucketSize?: number;
    rateLimitRefillAmount?: number;
    rateLimitRefillInterval?: number;
    apiScopeIds?: string[];
  }
) {
  let clientId: string;
  let clientSecretValue: string;

  if (args.forWorkspaceId) {
    const { id, secret } = await db.clients.createRoot({
      name: generateRandomName(),
      apiId: args.apiId,
      version: 1,
      workspaceId: args.workspaceId,
      forWorkspaceId: args.forWorkspaceId,
      rateLimitBucketSize: args.rateLimitBucketSize ?? 1000,
      rateLimitRefillAmount: args.rateLimitRefillAmount ?? 10,
      rateLimitRefillInterval: args.rateLimitRefillInterval ?? 10,
      apiScopes: args.apiScopeIds ?? [],
      metadata: generateJsonObject(10),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    clientId = id;
    clientSecretValue = secret;
  } else {
    const { id, secret } = await db.clients.createBasic({
      name: generateRandomName(),
      apiId: args.apiId,
      version: 1,
      workspaceId: args.workspaceId,
      rateLimitBucketSize: args.rateLimitBucketSize ?? 1000,
      rateLimitRefillAmount: args.rateLimitRefillAmount ?? 10,
      rateLimitRefillInterval: args.rateLimitRefillInterval ?? 10,
      metadata: generateJsonObject(10),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    clientId = id;
    clientSecretValue = secret;
  }

  return { clientId, clientSecretValue };
}
