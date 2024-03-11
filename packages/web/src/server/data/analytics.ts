import { env } from "@/env";
import { z } from "zod";

type GetGenerations = {
  workspaceId: string;
  apiId?: string;
  month: number;
  year: number;
};

export async function getGenerations(params: GetGenerations) {
  const url = new URL(env.TINY_BIRD_MONTHLY_GENERATIONS_ENDPOINT);

  url.searchParams.set("workspaceId", params.workspaceId);
  url.searchParams.set("month", params.month.toString());
  url.searchParams.set("year", params.year.toString());
  url.searchParams.set("token", env.TINY_BIRD_API_KEY);

  if (params.apiId) {
    url.searchParams.set("apiId", params.apiId);
  }

  const req = new Request(url, {
    method: "GET",
  });

  const res = await fetch(req);

  if (!res.ok) {
    throw new Error(
      `Failed to get generations for workspace. Status: ${res.status} ${await res.text()}`,
    );
  }

  const resJson = (await res.json()) as { data: unknown[] };

  if (resJson.data.length === 0) {
    return {
      total: 0,
    };
  }

  const data = resJson.data[0];

  const schema = z.object({
    total: z.number().min(0),
    timestamp: z.string(),
  });

  const validData = schema.parse(data);

  return {
    total: validData.total,
  };
}

type GetVerifications = {
  workspaceId: string;
  apiId?: string;
  month: number;
  year: number;
};

export async function getVerifications(params: GetVerifications) {
  const url = new URL(env.TINY_BIRD_MONTHLY_VERIFICATIONS_ENDPOINT);

  url.searchParams.set("workspaceId", params.workspaceId);
  url.searchParams.set("month", params.month.toString());
  url.searchParams.set("year", params.year.toString());
  url.searchParams.set("token", env.TINY_BIRD_API_KEY);

  if (params.apiId) {
    url.searchParams.set("apiId", params.apiId);
  }

  const req = new Request(url, {
    method: "GET",
  });

  const res = await fetch(req);

  if (!res.ok) {
    throw new Error(
      `Failed to get verifications for workspace. Status: ${res.status} ${await res.text()}`,
    );
  }

  const resJson = (await res.json()) as { data: unknown[] };

  if (resJson.data.length === 0) {
    return {
      successful: 0,
      failed: 0,
    };
  }

  const data = resJson.data[0];

  const schema = z.object({
    success: z.number().min(0),
    failure: z.number().min(0),
    timestamp: z.string(),
  });

  const validData = schema.parse(data);

  return {
    successful: validData.success,
    failed: validData.failure,
  };
}
