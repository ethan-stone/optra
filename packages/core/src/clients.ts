import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { eq, and, isNull, inArray, sql } from "drizzle-orm";
import { uid } from "./uid";
import { hashSHA256 } from "./crypto-utils";

export type Client = typeof schema.clients.$inferSelect & { scopes?: string[] };
export type CreateRootClientParams = Omit<
  typeof schema.clients.$inferInsert,
  "id" | "forWorkspaceId" | "currentClientSecretId" | "nextClientSecretId"
> &
  Required<Pick<typeof schema.clients.$inferInsert, "forWorkspaceId">> & {
    apiScopes?: string[];
  };
export type CreateBasicClientParams = Omit<
  typeof schema.clients.$inferInsert,
  "id" | "forWorkspaceId" | "currentClientSecretId" | "nextClientSecretId"
> & {
  apiScopes?: string[];
};
export type UpdateClientParams = {
  name?: string;
  rateLimitBucketSize?: number;
  rateLimitRefillAmount?: number;
  rateLimitRefillInterval?: number;
  metadata?: Record<string, unknown>;
};

export type CreateClientScopeParams = Omit<
  typeof schema.clientScopes.$inferInsert,
  "id"
>;
export type ClientScope = typeof schema.clientScopes.$inferSelect;

export type SetClientScopesParams = {
  clientId: string;
  workspaceId: string;
  apiScopeIds: string[];
};

export interface ClientRepo {
  getById(id: string): Promise<Client | null>;
  update(id: string, params: UpdateClientParams): Promise<void>;
  delete(id: string): Promise<void>;
  createRoot(
    params: CreateRootClientParams
  ): Promise<{ id: string; secret: string }>;
  createBasic(
    params: CreateBasicClientParams
  ): Promise<{ id: string; secret: string }>;
  getScopesByClientId(clientId: string): Promise<ClientScope[]>;
  createScope(params: CreateClientScopeParams): Promise<{ id: string }>;
  deleteScopeByApiScopeId(apiScopeId: string): Promise<void>;
  listByApiId(apiId: string): Promise<Client[]>;
  listRootForWorkspace(workspaceId: string): Promise<Client[]>;
  countForApis(params: {
    apiIds: string[];
    month: number;
    year: number;
  }): Promise<{ total: number; apiId: string }[]>;
  setScopes(params: SetClientScopesParams): Promise<void>;
}

export class DrizzleClientRepo implements ClientRepo {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getById(id: string): Promise<Client | null> {
    const client = await this.db.query.clients.findFirst({
      where: and(eq(schema.clients.id, id), isNull(schema.clients.deletedAt)),
      with: {
        scopes: {
          with: {
            apiScope: true,
          },
        },
      },
    });

    if (!client) return null;

    const scopes = client.scopes.map((s) => s.apiScope.name);

    return { ...client, scopes };
  }

  async update(id: string, params: UpdateClientParams): Promise<void> {
    await this.db
      .update(schema.clients)
      .set(params)
      .where(eq(schema.clients.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db
      .update(schema.clients)
      .set({ deletedAt: new Date() })
      .where(eq(schema.clients.id, id));
  }

  async createRoot(
    params: CreateRootClientParams
  ): Promise<{ id: string; secret: string }> {
    const clientId = params.clientIdPrefix
      ? `${params.clientIdPrefix}_${uid()}`
      : uid("client");
    const secretId = uid("csk");
    const secretValue = params.clientSecretPrefix
      ? `${params.clientSecretPrefix}_${uid()}`
      : uid();

    await this.db.transaction(async (tx) => {
      await tx.insert(schema.clients).values({
        id: clientId,
        currentClientSecretId: secretId,
        ...params,
      });

      await tx.insert(schema.clientSecrets).values({
        id: secretId,
        workspaceId: params.workspaceId,
        secret: await hashSHA256(secretValue),
        status: "active",
        createdAt: new Date(),
      });

      if (params.apiScopes) {
        for (const apiScope of params.apiScopes) {
          await tx.insert(schema.clientScopes).values({
            id: uid("client_scope"),
            apiScopeId: apiScope,
            clientId: clientId,
            workspaceId: params.workspaceId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    });

    return {
      id: clientId,
      secret: secretValue,
    };
  }

  async createBasic(
    params: CreateBasicClientParams
  ): Promise<{ id: string; secret: string }> {
    const clientId = params.clientIdPrefix
      ? params.clientIdPrefix + "_" + uid()
      : uid();
    const secretId = uid("csk");
    const secretValue = params.clientSecretPrefix
      ? params.clientSecretPrefix + "_" + uid()
      : uid();

    const now = new Date();

    await this.db.transaction(async (tx) => {
      await tx.insert(schema.clients).values({
        id: clientId,
        currentClientSecretId: secretId,
        ...params,
      });

      await tx.insert(schema.clientSecrets).values({
        id: secretId,
        workspaceId: params.workspaceId,
        secret: await hashSHA256(secretValue),
        status: "active",
        createdAt: now,
      });

      if (params.apiScopes) {
        for (const apiScope of params.apiScopes) {
          await tx.insert(schema.clientScopes).values({
            id: uid("client_scope"),
            apiScopeId: apiScope,
            clientId: clientId,
            workspaceId: params.workspaceId,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    });

    return {
      id: clientId,
      secret: secretValue,
    };
  }

  async getScopesByClientId(clientId: string): Promise<ClientScope[]> {
    const scopes = await this.db.query.clientScopes.findMany({
      where: eq(schema.clientScopes.clientId, clientId),
    });

    return scopes;
  }

  async setScopes(params: SetClientScopesParams): Promise<void> {
    const now = new Date();

    await this.db.transaction(async (tx) => {
      await tx
        .delete(schema.clientScopes)
        .where(eq(schema.clientScopes.clientId, params.clientId));

      for (const apiScopeId of params.apiScopeIds) {
        await tx.insert(schema.clientScopes).values({
          id: uid("client_scope"),
          apiScopeId,
          clientId: params.clientId,
          workspaceId: params.workspaceId,
          createdAt: now,
          updatedAt: now,
        });
      }
    });
  }

  async createScope(params: CreateClientScopeParams): Promise<{ id: string }> {
    const clientScopeId = uid("client_scope");

    await this.db.insert(schema.clientScopes).values({
      id: clientScopeId,
      ...params,
    });

    return {
      id: clientScopeId,
    };
  }

  async deleteScopeByApiScopeId(apiScopeId: string): Promise<void> {
    await this.db
      .delete(schema.clientScopes)
      .where(eq(schema.clientScopes.apiScopeId, apiScopeId));
  }

  async listByApiId(apiId: string): Promise<Client[]> {
    const clients = await this.db.query.clients.findMany({
      where: and(
        eq(schema.clients.apiId, apiId),
        isNull(schema.clients.deletedAt)
      ),
      with: {
        scopes: {
          with: {
            apiScope: true,
          },
        },
      },
    });

    return clients.map((client) => ({
      ...client,
      scopes: client.scopes.map((s) => s.apiScope.name),
    }));
  }

  async listRootForWorkspace(workspaceId: string): Promise<Client[]> {
    const clients = await this.db.query.clients.findMany({
      where: and(
        eq(schema.clients.forWorkspaceId, workspaceId),
        isNull(schema.clients.deletedAt)
      ),
    });
    return clients;
  }

  async countForApis(params: {
    apiIds: string[];
  }): Promise<{ total: number; apiId: string }[]> {
    const results = await this.db
      .select({
        total: sql<number>`count(*)`,
        apiId: schema.clients.apiId,
      })
      .from(schema.clients)
      .groupBy(schema.clients.apiId)
      .where(
        and(
          inArray(schema.clients.apiId, params.apiIds),
          isNull(schema.clients.deletedAt)
        )
      );

    return results;
  }
}
