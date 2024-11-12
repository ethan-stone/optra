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

  const generations = await tokenGenerations.getTotals({
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

  const verifications = await tokenVerifications.getTotals({
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

function fillTokenVerificationsByMonth(
  data: {
    year: number;
    month: number;
    successful: number;
    failed: number;
  }[],
  start: Date,
  end: Date,
) {
  const recordMap = new Map<
    string,
    { year: number; month: number; successful: number; failed: number }
  >(
    data.map((item) => [
      `${item.year}-${item.month}`,
      {
        year: item.year,
        month: item.month,
        successful: item.successful,
        failed: item.failed,
      },
    ]),
  );

  const filledRecords: {
    year: number;
    month: number;
    successful: number;
    failed: number;
  }[] = [];

  const startDate = new Date(start);
  const endDate = new Date(end);

  while (startDate <= endDate) {
    const key = `${startDate.getFullYear()}-${startDate.getMonth() + 1}`;

    if (recordMap.has(key)) {
      filledRecords.push(recordMap.get(key)!);
    } else {
      filledRecords.push({ year: 0, month: 0, successful: 0, failed: 0 });
    }

    startDate.setMonth(startDate.getMonth() + 1);
  }

  return filledRecords;
}

export async function getVerificationsGroupedByMonth(
  params: GetGroupedByMonth,
) {
  const tokenVerifications = await getTokenVerificationsRepo();

  const result = await tokenVerifications.getGroupedByMonth({
    workspaceId: params.workspaceId,
    timestampGt: params.timestampGt,
    timestampLt: params.timestampLt,
    apiId: params.apiId,
    clientId: params.clientId,
  });

  return fillTokenVerificationsByMonth(
    result,
    params.timestampGt,
    params.timestampLt,
  ).sort((a, b) => {
    if (a.year < b.year) {
      return -1;
    }
    return a.month - b.month;
  });
}

function fillTokenGenerationsByMonth(
  data: {
    year: number;
    month: number;
    total: number;
  }[],
  start: Date,
  end: Date,
) {
  const recordMap = new Map<
    string,
    { year: number; month: number; total: number }
  >(
    data.map((item) => [
      `${item.year}-${item.month}`,
      { year: item.year, month: item.month, total: item.total },
    ]),
  );

  const startDate = new Date(start);
  const endDate = new Date(end);

  const filledRecords: {
    year: number;
    month: number;
    total: number;
  }[] = [];

  while (startDate <= endDate) {
    const key = `${startDate.getFullYear()}-${startDate.getMonth() + 1}`;

    if (recordMap.has(key)) {
      filledRecords.push(recordMap.get(key)!);
    } else {
      filledRecords.push({ year: 0, month: 0, total: 0 });
    }

    startDate.setMonth(startDate.getMonth() + 1);
  }

  return filledRecords;
}

export async function getGenerationsGroupedByMonth(params: GetGroupedByMonth) {
  const tokenGenerations = await getTokenGenerationsRepo();

  const result = await tokenGenerations.getGroupedByMonth({
    timestampGt: params.timestampGt,
    timestampLt: params.timestampLt,
    workspaceId: params.workspaceId,
    apiId: params.apiId,
  });

  const filledGenerationsByMonth = fillTokenGenerationsByMonth(
    result,
    params.timestampGt,
    params.timestampLt,
  ).sort((a, b) => {
    if (a.year < b.year) {
      return -1;
    }
    return a.month - b.month;
  });

  console.log(filledGenerationsByMonth);

  return filledGenerationsByMonth;
}
