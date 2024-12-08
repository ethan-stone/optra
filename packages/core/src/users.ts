import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

export type CreateUserParams = typeof schema.users.$inferInsert;
export type User = typeof schema.users.$inferSelect;

export interface UserRepo {
  create(params: CreateUserParams): Promise<User>;
  getById(id: string): Promise<User | null>;
  setActiveWorkspaceId(userId: string, workspaceId: string): Promise<void>;
}

export class DrizzleUserRepo implements UserRepo {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async create(params: CreateUserParams): Promise<User> {
    await this.db.insert(schema.users).values({
      ...params,
    });

    return {
      ...params,
      role: params.role ?? "admin",
      activeWorkspaceId: params.activeWorkspaceId ?? null,
    };
  }

  async getById(id: string): Promise<User | null> {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, id),
    });

    return user ?? null;
  }

  async setActiveWorkspaceId(
    userId: string,
    workspaceId: string | null
  ): Promise<void> {
    await this.db
      .update(schema.users)
      .set({ activeWorkspaceId: workspaceId })
      .where(eq(schema.users.id, userId));
  }
}
