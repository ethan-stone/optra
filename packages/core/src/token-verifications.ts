import { eq, and, sql, gte, lte } from "drizzle-orm";
import { tokenVerifications } from "./schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema } from ".";

export type CreateTokenVerificationParams =
  typeof schema.tokenVerifications.$inferInsert;

export type GetGroupedByMonthForWorkspaceResult = {
  successful: number;
  failed: number;
  month: number;
  year: number;
};

export interface TokenVerificationRepo {
  create(tokenVerification: CreateTokenVerificationParams): Promise<void>;
  getForWorkspace(params: {
    workspaceId: string;
    month: number;
    year: number;
    apiId?: string;
  }): Promise<{ successful: number; failed: number }>;
  getGroupedByMonthForWorkspace(params: {
    workspaceId: string;
    timestampGt: Date;
    timestampLt: Date;
    apiId?: string;
  }): Promise<GetGroupedByMonthForWorkspaceResult[]>;
}

export class DrizzleTokenVerificationRepo implements TokenVerificationRepo {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async create(
    tokenVerification: CreateTokenVerificationParams
  ): Promise<void> {
    await this.db.insert(tokenVerifications).values({
      workspaceId: tokenVerification.workspaceId,
      apiId: tokenVerification.apiId,
      clientId: tokenVerification.clientId,
      timestamp: tokenVerification.timestamp,
      deniedReason: tokenVerification.deniedReason,
    });
  }

  async getForWorkspace(params: {
    workspaceId: string;
    month: number;
    year: number;
    apiId?: string;
  }): Promise<{ successful: number; failed: number }> {
    const result = await this.db
      .select({
        successful: sql<string>`SUM(CASE WHEN ${tokenVerifications.deniedReason} IS NULL THEN 1 ELSE 0 END)`,
        failed: sql<string>`SUM(CASE WHEN ${tokenVerifications.deniedReason} IS NOT NULL THEN 1 ELSE 0 END)`,
      })
      .from(tokenVerifications)
      .where(
        and(
          eq(tokenVerifications.workspaceId, params.workspaceId),
          sql`EXTRACT(MONTH FROM ${tokenVerifications.timestamp}) = ${params.month}`,
          sql`EXTRACT(YEAR FROM ${tokenVerifications.timestamp}) = ${params.year}`,
          params.apiId ? eq(tokenVerifications.apiId, params.apiId) : undefined
        )
      );

    return {
      successful: parseInt(result[0]?.successful ?? "0"),
      failed: parseInt(result[0]?.failed ?? "0"),
    };
  }

  async getGroupedByMonthForWorkspace(params: {
    workspaceId: string;
    timestampGt: Date;
    timestampLt: Date;
    apiId?: string;
  }): Promise<GetGroupedByMonthForWorkspaceResult[]> {
    const result = await this.db
      .select({
        successful: sql<string>`SUM(CASE WHEN ${tokenVerifications.deniedReason} IS NULL THEN 1 ELSE 0 END)`,
        failed: sql<string>`SUM(CASE WHEN ${tokenVerifications.deniedReason} IS NOT NULL THEN 1 ELSE 0 END)`,
        month: sql<string>`EXTRACT(MONTH FROM ${tokenVerifications.timestamp})`,
        year: sql<string>`EXTRACT(YEAR FROM ${tokenVerifications.timestamp})`,
      })
      .from(tokenVerifications)
      .where(
        and(
          eq(tokenVerifications.workspaceId, params.workspaceId),
          gte(tokenVerifications.timestamp, params.timestampGt),
          lte(tokenVerifications.timestamp, params.timestampLt),
          params.apiId ? eq(tokenVerifications.apiId, params.apiId) : undefined
        )
      )
      .groupBy(
        sql`EXTRACT(MONTH FROM ${tokenVerifications.timestamp})`,
        sql`EXTRACT(YEAR FROM ${tokenVerifications.timestamp})`
      );

    return result.map((item) => ({
      successful: parseInt(item.successful),
      failed: parseInt(item.failed),
      month: parseInt(item.month),
      year: parseInt(item.year),
    }));
  }
}
