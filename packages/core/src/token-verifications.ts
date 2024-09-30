import { eq, and, sql } from "drizzle-orm";
import { tokenVerifications } from "./schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema } from ".";

export type CreateTokenVerificationParams =
  typeof schema.tokenVerifications.$inferInsert;

export interface TokenVerificationRepo {
  create(tokenVerification: CreateTokenVerificationParams): Promise<void>;
  getForWorkspace(params: {
    workspaceId: string;
    month: number;
    year: number;
  }): Promise<{ successful: number; failed: number }>;
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
        successful: sql<number>`SUM(CASE WHEN ${tokenVerifications.deniedReason} IS NULL THEN 1 ELSE 0 END)`,
        failed: sql<number>`SUM(CASE WHEN ${tokenVerifications.deniedReason} IS NOT NULL THEN 1 ELSE 0 END)`,
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
      successful: result[0]?.successful ?? 0,
      failed: result[0]?.failed ?? 0,
    };
  }
}
