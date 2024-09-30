import { eq, and, sql, inArray } from "drizzle-orm";
import { tokenGenerations } from "./schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema } from ".";

export type CreateTokenGenerationParams =
  typeof schema.tokenGenerations.$inferInsert;

export type TokenGeneration = typeof schema.tokenGenerations.$inferSelect;

export interface TokenGenerationRepo {
  create(tokenGeneration: CreateTokenGenerationParams): Promise<void>;
  getForWorkspace(params: {
    workspaceId: string;
    month: number;
    year: number;
    apiId?: string;
  }): Promise<{ total: number }>;
  getForApis(params: {
    apiIds: string[];
    month: number;
    year: number;
  }): Promise<{ total: number; apiId: string }[]>;
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

  async getForWorkspace(params: {
    workspaceId: string;
    month: number;
    year: number;
    apiId?: string;
  }): Promise<{ total: number }> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(tokenGenerations)
      .where(
        and(
          eq(tokenGenerations.workspaceId, params.workspaceId),
          sql`EXTRACT(MONTH FROM ${tokenGenerations.timestamp}) = ${params.month}`,
          sql`EXTRACT(YEAR FROM ${tokenGenerations.timestamp}) = ${params.year}`,
          params.apiId ? eq(tokenGenerations.apiId, params.apiId) : undefined
        )
      );

    return {
      total: result[0]?.count ?? 0,
    };
  }

  async getForApis(params: {
    apiIds: string[];
    month: number;
    year: number;
  }): Promise<{ total: number; apiId: string }[]> {
    const results = await this.db
      .select({
        total: sql<number>`count(*)`,
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

    return results;
  }
}
