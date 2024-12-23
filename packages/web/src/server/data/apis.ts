import { getDrizzle } from "@optra/core/drizzle";
import {
  type Api,
  DrizzleApiRepo,
  type CreateApiParams,
} from "@optra/core/apis";
import { DrizzleTokenGenerationRepo } from "@optra/core/token-generations";
import { DrizzleClientRepo } from "@optra/core/clients";
import {
  DrizzleSigningSecretRepo,
  type SigningSecret,
} from "@optra/core/signing-secrets";
import { env } from "@/env";
import { getScheduler } from "../scheduler";

async function getApiRepo() {
  const { db } = await getDrizzle(env.DATABASE_URL);
  return new DrizzleApiRepo(db);
}

async function getTokenRepo() {
  const { db } = await getDrizzle(env.DATABASE_URL);
  return new DrizzleTokenGenerationRepo(db);
}

async function getClientRepo() {
  const { db } = await getDrizzle(env.DATABASE_URL);
  return new DrizzleClientRepo(db);
}

async function getSigningSecretRepo() {
  const { db } = await getDrizzle(env.DATABASE_URL);
  return new DrizzleSigningSecretRepo(db);
}

export async function getApiByWorkspaceIdAndApiId(
  workspaceId: string,
  apiId: string,
) {
  const [apis, signingSecrets] = await Promise.all([
    getApiRepo(),
    getSigningSecretRepo(),
  ]);

  const api = await apis.getById(apiId);

  if (!api) {
    return null;
  }

  if (api.workspaceId !== workspaceId) {
    return null;
  }

  const currentSigningSecret = await signingSecrets.getById(
    api.currentSigningSecretId,
  );

  if (!currentSigningSecret) {
    throw new Error(
      `currentSigningSecretId ${api.currentSigningSecretId} not found for api ${api.id}. This should be impossible.`,
    );
  }

  let nextSigningSecret: SigningSecret | null = null;

  if (api.nextSigningSecretId !== null) {
    const nextSigningSecretLocal = await signingSecrets.getById(
      api.nextSigningSecretId,
    );

    if (!nextSigningSecretLocal) {
      throw new Error(
        `nextSigningSecretId ${api.nextSigningSecretId} not found for api ${api.id} despite not being null. This should be impossible.`,
      );
    }

    nextSigningSecret = nextSigningSecretLocal;
  }

  return {
    ...api,
    currentSigningSecret,
    nextSigningSecret,
  };
}

export async function getScopesForApi(apiId: string) {
  const apis = await getApiRepo();

  return apis.getScopesByApiId(apiId);
}

/**
 * Rather than creating all the scopes for an API that are available to a root client when the API is created,
 * we lazy load them when a root client is created or updated. This function handles that logic.
 *
 * This apiId provided should be the internal Optra API ID. Then the scope names provided should be in the
 * format of "api:<scope_name>:<api_id>".
 *
 * We have a unique index on API ID and scope name, so we should not have any collisions.
 */
export async function lazyLoadRootClientScopes(
  internalApiId: string,
  internalWorkspaceId: string,
  scopes: { name: string; description: string }[],
) {
  const apis = await getApiRepo();

  const existingScopes = await apis.getScopesByNameAndApiId(
    internalApiId,
    scopes.map((scope) => scope.name),
  );

  const nonExistingScopesNames: string[] = [];

  for (const scope of scopes) {
    if (
      !existingScopes.find((existingScope) => existingScope.name === scope.name)
    ) {
      nonExistingScopesNames.push(scope.name);
    }
  }

  // If all the scopes already exist, we can return early
  if (nonExistingScopesNames.length === 0) {
    return existingScopes;
  }

  const now = new Date();

  const newScopes = await apis.createScopes(
    nonExistingScopesNames.map((name) => ({
      apiId: internalApiId,
      name,
      description:
        scopes.find((scope) => scope.name === name)?.description ?? "",
      workspaceId: internalWorkspaceId,
      createdAt: now,
      updatedAt: now,
    })),
  );

  return [...existingScopes, ...newScopes];
}

/**
 * This returns the scopes that have actually been created for a root client
 * for a given API.
 *
 * This internalApiId provided should be the internal Optra API ID. Then the scope names provided should be in the
 * format of "api:<scope_name>:<api_id>".
 *
 * @param internalApiId
 * @param scopes
 * @returns
 */
export async function getRootClientScopes(
  internalApiId: string,
  scopes: { name: string }[],
) {
  const apis = await getApiRepo();

  const existingScopes = await apis.getScopesByNameAndApiId(
    internalApiId,
    scopes.map((scope) => scope.name),
  );

  return existingScopes;
}

type UpdateApiByIdArgs = {
  tokenExpirationInSeconds: number;
  name: string;
};

export async function updateApiById(id: string, args: UpdateApiByIdArgs) {
  const apis = await getApiRepo();

  await apis.update(id, {
    tokenExpirationInSeconds: args.tokenExpirationInSeconds,
    name: args.name,
  });
}

type AddScopeToApiArgs = {
  workspaceId: string;
  apiId: string;
  name: string;
  description: string;
};

export async function addScopeToApi(args: AddScopeToApiArgs) {
  const now = new Date();

  const apis = await getApiRepo();

  const scope = await apis.createScope({
    workspaceId: args.workspaceId,
    apiId: args.apiId,
    name: args.name,
    description: args.description,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: scope.id,
  };
}

export async function getApiScopeById(id: string) {
  const apis = await getApiRepo();

  return apis.getScopeById(id);
}

export async function deleteApiScopeById(id: string) {
  const apis = await getApiRepo();

  await apis.deleteScopeById(id);
}

export async function createApi(args: CreateApiParams) {
  const apis = await getApiRepo();

  return apis.create(args);
}

export async function deleteApi(id: string) {
  const apis = await getApiRepo();

  await apis.delete(id);
}

export async function getApisForWorkspace(workspaceId: string) {
  const [apis, tokenGenerations, clients] = await Promise.all([
    getApiRepo(),
    getTokenRepo(),
    getClientRepo(),
  ]);

  const apiList = await apis.listByWorkspaceId(workspaceId);

  const apiIds = apiList.map((api) => api.id);

  const now = new Date();

  const [tokenGenerationList, clientList] = await Promise.all([
    tokenGenerations.getTotalsForApis({
      apiIds,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    }),
    clients.countForApis({
      apiIds,
    }),
  ]);

  return apiList.map((api) => {
    const tokenGeneration = tokenGenerationList.find(
      (tokenGeneration) => tokenGeneration.apiId === api.id,
    );
    const client = clientList.find((client) => client.apiId === api.id);

    return {
      ...api,
      numClients: client?.total ?? 0,
      numTokens: tokenGeneration?.total ?? 0,
    };
  }) as (Api & {
    numClients: number | undefined;
    numTokens: number | undefined;
  })[];
}

export async function getApiScopes(apiId: string) {
  const apis = await getApiRepo();

  return apis.getScopesByApiId(apiId);
}

type RotateSigningSecretForApiArgs = {
  apiId: string;
  algorithm: "rsa256" | "hsa256";
  encryptedSigningSecret: string;
  iv: string;
  expiresAt?: Date | null;
};

export async function rotateSigningSecretForApi(
  args: RotateSigningSecretForApiArgs,
) {
  const [apis, signingSecrets, scheduler] = await Promise.all([
    getApiRepo(),
    getSigningSecretRepo(),
    getScheduler(),
  ]);

  const api = await apis.getById(args.apiId);

  if (!api) {
    throw new Error(`API with id ${args.apiId} not found`);
  }

  const now = new Date();

  const expiresAtLocal = args.expiresAt ?? new Date(now.getTime() + 1000 * 60);

  const newSigningSecret = await signingSecrets.rotate({
    apiId: args.apiId,
    algorithm: args.algorithm,
    encryptedSigningSecret: args.encryptedSigningSecret,
    iv: args.iv,
    expiresAt: expiresAtLocal,
  });

  await scheduler.createOneTimeSchedule({
    at: expiresAtLocal,
    eventType: "api.signing_secret.expired",
    payload: {
      workspaceId: api.workspaceId,
      apiId: args.apiId,
      signingSecretId: api.currentSigningSecretId,
    },
    timestamp: Date.now(),
  });

  return { id: newSigningSecret.id };
}
