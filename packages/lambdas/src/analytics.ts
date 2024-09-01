import { Resource } from "sst";
import { z } from "zod";

type GetVerificationForWorkspace = {
  workspaceId: string;
  month: number;
  year: number;
};

type GetVerificationsForWorkspaceResponse = {
  successful: number;
  failed: number;
};

type GetGenerationsForWorkspaceResponse = {
  total: number;
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
        successful: 0,
        failed: 0,
      };
    }

    const data = resJson.data[0];

    const schema = z.object({
      success: z.number().min(0),
      failure: z.number().min(0),
    });

    const validData = schema.parse(data);

    return {
      successful: validData.success,
      failed: validData.failure,
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
        total: 0,
      };
    }

    const data = resJson.data[0];

    const schema = z.object({
      total: z.number().min(0),
    });

    const validData = schema.parse(data);

    return {
      total: validData.total,
    };
  }
}

export class NoopAnalytics implements Analytics {
  async getVerificationsForWorkspace(
    _: GetVerificationForWorkspace
  ): Promise<GetVerificationsForWorkspaceResponse> {
    return {
      successful: 10000,
      failed: 500,
    };
  }
  async getGenerationsForWorkspace(
    _: GetVerificationForWorkspace
  ): Promise<GetGenerationsForWorkspaceResponse> {
    return {
      total: 1000,
    };
  }
}

export function getAnalytics(): Analytics {
  return new TinyBirdAnalytics({
    apiKey: Resource.TinyBirdApiKey.value,
    baseUrl: Resource.TinyBirdUrl.value,
    generationsForWorkspaceEndpoint: Resource.TinyBirdGenerationsEndpoint.value,
    verificationForWorkspaceEndpoint:
      Resource.TinyBirdVerificationsEndpoint.value,
  });
}
