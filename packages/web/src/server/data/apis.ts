import { getDrizzle } from "@optra/core/drizzle";
import { DrizzleApiRepo, type CreateApiParams } from "@optra/core/apis";
import { env } from "@/env";

async function getApiRepo() {
  const { db } = await getDrizzle(env.DATABASE_URL);
  return new DrizzleApiRepo(db);
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
