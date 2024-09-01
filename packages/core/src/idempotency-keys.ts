import { and, eq, lt, isNotNull } from "drizzle-orm";
import { idempotencyKeys } from "./schema";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { schema } from ".";

export type CreateIdempotencyKeyParams =
  typeof schema.idempotencyKeys.$inferInsert;

export type IdempotencyKey = typeof schema.idempotencyKeys.$inferSelect;

export interface IdempotencyKeyRepo {
  getByKey(key: string): Promise<IdempotencyKey | null>;
  create(params: CreateIdempotencyKeyParams): Promise<void>;
  deleteExpired(): Promise<void>;
}

export class DrizzleIdempotencyKeyRepo implements IdempotencyKeyRepo {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async getByKey(key: string): Promise<IdempotencyKey | null> {
    const result = await this.db.query.idempotencyKeys.findFirst({
      where: eq(idempotencyKeys.key, key),
    });

    return result ?? null;
  }

  async create(params: CreateIdempotencyKeyParams) {
    await this.db.insert(schema.idempotencyKeys).values({
      key: params.key,
      expiresAt: params.expiresAt,
      createdAt: new Date(),
    });
  }

  async deleteExpired() {
    const now = new Date();
    await this.db
      .delete(schema.idempotencyKeys)
      .where(
        and(
          isNotNull(idempotencyKeys.expiresAt),
          lt(idempotencyKeys.expiresAt, now)
        )
      );
  }
}
