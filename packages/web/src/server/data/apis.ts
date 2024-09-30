import { getDrizzle } from "@optra/core/drizzle";
import {
  type Api,
  DrizzleApiRepo,
  type CreateApiParams,
} from "@optra/core/apis";
import { DrizzleTokenGenerationRepo } from "@optra/core/token-generations";
import { DrizzleClientRepo } from "@optra/core/clients";
import { env } from "@/env";

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

export async function getApiByWorkspaceIdAndApiId(
  workspaceId: string,
  apiId: string,
) {
  const apis = await getApiRepo();

  const api = await apis.getById(apiId);

  if (!api) {
    return null;
  }

  if (api.workspaceId !== workspaceId) {
    return null;
  }

  return api;
}

export async function getScopesForApi(apiId: string) {
  const apis = await getApiRepo();

  return apis.getScopesByApiId(apiId);
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
  apiId: string;
  name: string;
  description: string;
};

export async function addScopeToApi(args: AddScopeToApiArgs) {
  const now = new Date();

  const apis = await getApiRepo();

  const scope = await apis.createScope({
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
  const apis = await getApiRepo();
  const tokenGenerations = await getTokenRepo();
  const clients = await getClientRepo();

  const apiList = await apis.listByWorkspaceId(workspaceId);

  const apiIds = apiList.map((api) => api.id);

  const now = new Date();

  const tokenGenerationList = await tokenGenerations.getForApis({
    apiIds,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });

  console.log("tokenGenerationList", tokenGenerationList);

  const clientList = await clients.countForApis({
    apiIds,
  });

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
