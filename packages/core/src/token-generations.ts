import { eq, and, sql } from "drizzle-orm";
import { tokenGenerations } from "./schema";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { schema } from ".";

export type CreateTokenGenerationParams =
  typeof schema.tokenGenerations.$inferInsert;

export interface TokenGenerationRepo {
  create(tokenGeneration: CreateTokenGenerationParams): Promise<void>;
  getForWorkspace(params: {
    workspaceId: string;
    month: number;
    year: number;
    apiId?: string;
  }): Promise<{ total: number }>;
}

export class DrizzleTokenGenerationRepo implements TokenGenerationRepo {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

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
}
