import { env } from "@/env";
import { getDrizzle } from "@optra/core/drizzle";
import { DrizzleTokenGenerationRepo } from "@optra/core/token-generations";
import { DrizzleTokenVerificationRepo } from "@optra/core/token-verifications";

type GetGenerations = {
  workspaceId: string;
  apiId?: string;
  clientId?: string;
  month: number;
  year: number;
};

async function getTokenGenerationsRepo() {
  const { db } = await getDrizzle(env.DATABASE_URL);

  const repo = new DrizzleTokenGenerationRepo(db);

  return repo;
}

export async function getGenerations(params: GetGenerations) {
  const tokenGenerations = await getTokenGenerationsRepo();

  const generations = await tokenGenerations.getForWorkspace({
    workspaceId: params.workspaceId,
    month: params.month,
    year: params.year,
    apiId: params.apiId,
    clientId: params.clientId,
  });

  return generations;
}

type GetVerifications = {
  workspaceId: string;
  apiId?: string;
  clientId?: string;
  month: number;
  year: number;
};

async function getTokenVerificationsRepo() {
  const { db } = await getDrizzle(env.DATABASE_URL);

  const repo = new DrizzleTokenVerificationRepo(db);

  return repo;
}

export async function getVerifications(params: GetVerifications) {
  const tokenVerifications = await getTokenVerificationsRepo();

  const verifications = await tokenVerifications.getForWorkspace({
    workspaceId: params.workspaceId,
    month: params.month,
    year: params.year,
    apiId: params.apiId,
  });

  return verifications;
}
type GetGroupedByMonth = {
  workspaceId: string;
  timestampGt: Date;
  timestampLt: Date;
  apiId?: string;
  clientId?: string;
};

export async function getVerificationsGroupedByMonth(
  params: GetGroupedByMonth,
) {
  const tokenVerifications = await getTokenVerificationsRepo();

  const result = await tokenVerifications.getGroupedByMonthForWorkspace({
    workspaceId: params.workspaceId,
    timestampGt: params.timestampGt,
    timestampLt: params.timestampLt,
    apiId: params.apiId,
    clientId: params.clientId,
  });

  return result;
}

export async function getGenerationsGroupedByMonth(params: GetGroupedByMonth) {
  const tokenGenerations = await getTokenGenerationsRepo();

  const result = await tokenGenerations.getGroupedByMonth({
    timestampGt: params.timestampGt,
    timestampLt: params.timestampLt,
    workspaceId: params.workspaceId,
    apiId: params.apiId,
  });

  return result;
}
