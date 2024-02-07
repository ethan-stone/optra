import { Config } from "sst/node/config";
import { z } from "zod";

type GetVerificationForWorkspace = {
  workspaceId: string;
  month: number;
  year: number;
};

type GetVerificationsForWorkspaceResponse = {
  successfulVerifications: number;
  failedVerificiations: number;
};

type GetGenerationsForWorkspaceResponse = {
  totalGenerations: number;
};

export interface Analytics {
  getVerificationsForWorkspace: (
    params: GetVerificationForWorkspace
  ) => Promise<GetVerificationsForWorkspaceResponse>;
  getGenerationsForWorkspace: (
    params: GetVerificationForWorkspace
  ) => Promise<GetGenerationsForWorkspaceResponse>;
}

type TinyBirdAnalyticsConfig = {
  baseUrl: string;
  apiKey: string;
  verificationForWorkspaceEndpoint: string;
  generationsForWorkspaceEndpoint: string;
};

export class TinyBirdAnalytics implements Analytics {
  constructor(private readonly config: TinyBirdAnalyticsConfig) {}

  async getVerificationsForWorkspace(
    params: GetVerificationForWorkspace
  ): Promise<GetVerificationsForWorkspaceResponse> {
    const url = new URL(this.config.verificationForWorkspaceEndpoint);

    url.searchParams.set("workspaceId", params.workspaceId);
    url.searchParams.set("month", params.month.toString());
    url.searchParams.set("year", params.year.toString());
    url.searchParams.set("token", this.config.apiKey);

    const req = new Request(url, {
      method: "GET",
    });

    const res = await fetch(req);

    if (!res.ok) {
      throw new Error(
        `Failed to get verifications for workspace. Status: ${
          res.status
        } ${await res.text()}`
      );
    }

    const resJson = (await res.json()) as any;

    if (resJson.data.length === 0) {
      return {
        successfulVerifications: 0,
        failedVerificiations: 0,
      };
    }

    const data = resJson.data[0];

    const schema = z.object({
      success: z.number().min(0),
      failure: z.number().min(0),
    });

    const validData = schema.parse(data);

    return {
      successfulVerifications: validData.success,
      failedVerificiations: validData.failure,
    };
  }

  async getGenerationsForWorkspace(
    params: GetVerificationForWorkspace
  ): Promise<GetGenerationsForWorkspaceResponse> {
    const url = new URL(this.config.generationsForWorkspaceEndpoint);

    url.searchParams.set("workspaceId", params.workspaceId);
    url.searchParams.set("month", params.month.toString());
    url.searchParams.set("year", params.year.toString());
    url.searchParams.set("token", this.config.apiKey);

    const req = new Request(url, {
      method: "GET",
    });

    const res = await fetch(req);

    if (!res.ok) {
      throw new Error(
        `Failed to get generations for workspace. Status: ${
          res.status
        } ${await res.text()}`
      );
    }

    const resJson = (await res.json()) as any;

    if (resJson.data.length === 0) {
      return {
        totalGenerations: 0,
      };
    }

    const data = resJson.data[0];

    const schema = z.object({
      total: z.number().min(0),
    });

    const validData = schema.parse(data);

    return {
      totalGenerations: validData.total,
    };
  }
}

export class NoopAnalytics implements Analytics {
  async getVerificationsForWorkspace(
    _: GetVerificationForWorkspace
  ): Promise<GetVerificationsForWorkspaceResponse> {
    return {
      successfulVerifications: 10000,
      failedVerificiations: 500,
    };
  }
  async getGenerationsForWorkspace(
    _: GetVerificationForWorkspace
  ): Promise<GetGenerationsForWorkspaceResponse> {
    return {
      totalGenerations: 1000,
    };
  }
}

export function getAnalytics(): Analytics {
  return new TinyBirdAnalytics({
    apiKey: Config.TINY_BIRD_API_KEY,
    baseUrl: Config.TINY_BIRD_BASE_URL,
    generationsForWorkspaceEndpoint:
      Config.TINY_BIRD_MONTHLY_GENERATIONS_ENDPOINT,
    verificationForWorkspaceEndpoint:
      Config.TINY_BIRD_MONTHLY_VERIFICATIONS_ENDPOINT,
  });
}
