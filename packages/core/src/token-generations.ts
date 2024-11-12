import { eq, and, sql, inArray, gte, lte } from "drizzle-orm";
import { tokenGenerations } from "./schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema } from ".";

export type CreateTokenGenerationParams =
  typeof schema.tokenGenerations.$inferInsert;

export type TokenGeneration = typeof schema.tokenGenerations.$inferSelect;

export type GetGroupedByMonthResult = {
  year: number;
  month: number;
  total: number;
};

export interface TokenGenerationRepo {
  create(tokenGeneration: CreateTokenGenerationParams): Promise<void>;
  getTotals(params: {
    workspaceId: string;
    month: number;
    year: number;
    apiId?: string;
  }): Promise<{ total: number }>;
  getTotalsForApis(params: {
    apiIds: string[];
    month: number;
    year: number;
  }): Promise<{ total: number; apiId: string }[]>;
  getTotalsForClients(params: {
    clientIds: string[];
    month: number;
    year: number;
  }): Promise<{ total: number; clientId: string }[]>;
  getGroupedByMonth(params: {
    timestampGt: Date;
    timestampLt: Date;
    workspaceId: string;
    apiId?: string;
  }): Promise<GetGroupedByMonthResult[]>;
}

export class DrizzleTokenGenerationRepo implements TokenGenerationRepo {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async create(tokenGeneration: CreateTokenGenerationParams): Promise<void> {
    await this.db.insert(tokenGenerations).values({
      workspaceId: tokenGeneration.workspaceId,
      apiId: tokenGeneration.apiId,
      clientId: tokenGeneration.clientId,
      timestamp: tokenGeneration.timestamp,
    });
  }

  async getTotals(params: {
    workspaceId: string;
    month: number;
    year: number;
    apiId?: string;
    clientId?: string;
  }): Promise<{ total: number }> {
    const result = await this.db
      .select({ count: sql<string>`count(*)` })
      .from(tokenGenerations)
      .where(
        and(
          eq(tokenGenerations.workspaceId, params.workspaceId),
          sql`EXTRACT(MONTH FROM ${tokenGenerations.timestamp}) = ${params.month}`,
          sql`EXTRACT(YEAR FROM ${tokenGenerations.timestamp}) = ${params.year}`,
          params.apiId ? eq(tokenGenerations.apiId, params.apiId) : undefined,
          params.clientId
            ? eq(tokenGenerations.clientId, params.clientId)
            : undefined
        )
      );

    return {
      total: parseInt(result[0]?.count ?? "0"),
    };
  }

  async getTotalsForApis(params: {
    apiIds: string[];
    month: number;
    year: number;
  }): Promise<{ total: number; apiId: string }[]> {
    const results = await this.db
      .select({
        total: sql<string>`count(*)`,
        apiId: tokenGenerations.apiId,
      })
      .from(tokenGenerations)
      .groupBy(tokenGenerations.apiId)
      .where(
        and(
          inArray(tokenGenerations.apiId, params.apiIds),
          sql`EXTRACT(MONTH FROM ${tokenGenerations.timestamp}) = ${params.month}`,
          sql`EXTRACT(YEAR FROM ${tokenGenerations.timestamp}) = ${params.year}`
        )
      );

    return results.map((item) => ({
      total: parseInt(item.total),
      apiId: item.apiId,
    }));
  }

  async getTotalsForClients(params: {
    clientIds: string[];
    month: number;
    year: number;
  }): Promise<{ total: number; clientId: string }[]> {
    const results = await this.db
      .select({
        total: sql<string>`count(*)`,
        clientId: tokenGenerations.clientId,
      })
      .from(tokenGenerations)
      .groupBy(tokenGenerations.clientId)
      .where(
        and(
          inArray(tokenGenerations.clientId, params.clientIds),
          sql`EXTRACT(MONTH FROM ${tokenGenerations.timestamp}) = ${params.month}`,
          sql`EXTRACT(YEAR FROM ${tokenGenerations.timestamp}) = ${params.year}`
        )
      );

    return results.map((item) => ({
      total: parseInt(item.total),
      clientId: item.clientId,
    }));
  }

  async getGroupedByMonth(params: {
    timestampGt: Date;
    timestampLt: Date;
    workspaceId: string;
    apiId?: string;
    clientId?: string;
  }): Promise<GetGroupedByMonthResult[]> {
    const result = await this.db
      .select({
        total: sql<string>`count(*)`,
        month: sql<string>`EXTRACT(MONTH FROM ${tokenGenerations.timestamp})`,
        year: sql<string>`EXTRACT(YEAR FROM ${tokenGenerations.timestamp})`,
      })
      .from(tokenGenerations)
      .where(
        and(
          eq(tokenGenerations.workspaceId, params.workspaceId),
          gte(tokenGenerations.timestamp, params.timestampGt),
          lte(tokenGenerations.timestamp, params.timestampLt),
          params.apiId ? eq(tokenGenerations.apiId, params.apiId) : undefined,
          params.clientId
            ? eq(tokenGenerations.clientId, params.clientId)
            : undefined
        )
      )
      .groupBy(
        sql`EXTRACT(MONTH FROM ${tokenGenerations.timestamp})`,
        sql`EXTRACT(YEAR FROM ${tokenGenerations.timestamp})`
      );

    return result.map((item) => ({
      total: parseInt(item.total),
      month: parseInt(item.month),
      year: parseInt(item.year),
    }));
  }
}
