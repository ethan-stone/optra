import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { uid } from "./uid";

export type Api = typeof schema.apis.$inferSelect & {
  scopes: (typeof schema.apiScopes.$inferSelect)[];
};

export type ApiScope = typeof schema.apiScopes.$inferSelect;

type UpdateApiParams = {
  tokenExpirationInSeconds?: number;
  name?: string;
};

export type CreateApiParams = Omit<
  typeof schema.apis.$inferInsert,
  "id" | "currentSigningSecretId" | "nextSigningSecretId" | "urls"
> & {
  scopes?: { name: string; description: string }[];
  jwksBaseUrl?: string; // must be provided if the algorithm is rsa256
  algorithm: "hsa256" | "rsa256";
  encryptedSigningSecret: string;
  iv: string;
};

export type CreateApiScopeParams = Omit<
  typeof schema.apiScopes.$inferInsert,
  "id"
>;

export interface ApiRepo {
  create(params: CreateApiParams): Promise<{
    id: string;
    currentSigningSecret: {
      id: string;
    };
  }>;
  update(id: string, params: UpdateApiParams): Promise<void>;
  getById(id: string): Promise<Api | null>;
  getByWorkspaceAndName(workspaceId: string, name: string): Promise<Api | null>;
  listByWorkspaceId(workspaceId: string): Promise<Api[]>;
  delete(id: string): Promise<void>;
  getScopesByApiId(apiId: string): Promise<ApiScope[]>;
  getScopesByNameAndApiId(
    apiId: string,
    scopeNames: string[]
  ): Promise<ApiScope[]>;
  getScopeById(id: string): Promise<ApiScope | null>;
  createScope(params: CreateApiScopeParams): Promise<{ id: string }>;
  createScopes(params: CreateApiScopeParams[]): Promise<{ id: string }[]>;
  deleteScopeById(id: string): Promise<void>;
}

export class DrizzleApiRepo implements ApiRepo {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async create(params: CreateApiParams): Promise<{
    id: string;
    currentSigningSecret: {
      id: string;
    };
  }> {
    const apiId = uid("api");
    const signingSecretId = uid("ssk");

    if (params.algorithm === "rsa256" && !params.jwksBaseUrl) {
      throw new Error("jwksBaseUrl is required for rsa256 apis");
    }

    await this.db.transaction(async (tx) => {
      await tx.insert(schema.signingSecrets).values({
        id: signingSecretId,
        workspaceId: params.workspaceId,
        secret: params.encryptedSigningSecret,
        iv: params.iv,
        status: "active",
        algorithm: params.algorithm,
        updatedAt: new Date(),
        createdAt: new Date(),
      });

      await tx.insert(schema.apis).values({
        id: apiId,
        currentSigningSecretId: signingSecretId,
        urls: {
          jwks: params.jwksBaseUrl
            ? params.jwksBaseUrl +
              `/jwks/${params.workspaceId}/${apiId}/.well-known/jwks.json`
            : null,
        },
        ...params,
      });

      const now = new Date();

      if (params.scopes) {
        for (const scopes of params.scopes) {
          await tx.insert(schema.apiScopes).values({
            id: uid("api_scope"),
            apiId: apiId,
            workspaceId: params.workspaceId,
            name: scopes.name,
            description: scopes.description,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    });

    return {
      id: apiId,
      currentSigningSecret: {
        id: signingSecretId,
      },
    };
  }

  async getById(id: string): Promise<Api | null> {
    const api = await this.db.query.apis.findFirst({
      where: and(eq(schema.apis.id, id), isNull(schema.apis.deletedAt)),
      with: {
        scopes: true,
      },
    });

    return api ?? null;
  }

  async update(id: string, params: UpdateApiParams): Promise<void> {
    await this.db.update(schema.apis).set(params).where(eq(schema.apis.id, id));
  }

  async getByWorkspaceAndName(
    workspaceId: string,
    name: string
  ): Promise<Api | null> {
    const api = await this.db.query.apis.findFirst({
      where: and(
        eq(schema.apis.workspaceId, workspaceId),
        eq(schema.apis.name, name),
        isNull(schema.apis.deletedAt)
      ),
      with: {
        scopes: true,
      },
    });

    return api ?? null;
  }

  async listByWorkspaceId(workspaceId: string): Promise<Api[]> {
    return this.db.query.apis.findMany({
      where: and(
        eq(schema.apis.workspaceId, workspaceId),
        isNull(schema.apis.deletedAt)
      ),
      with: {
        scopes: true,
      },
      orderBy: (table, { desc }) => desc(table.createdAt),
    });
  }

  async delete(id: string): Promise<void> {
    await this.db
      .update(schema.apis)
      .set({ deletedAt: new Date() })
      .where(eq(schema.apis.id, id));
  }

  async getScopesByApiId(apiId: string): Promise<ApiScope[]> {
    return this.db.query.apiScopes.findMany({
      where: eq(schema.apiScopes.apiId, apiId),
      orderBy: (table, { desc }) => desc(table.createdAt),
    });
  }

  async getScopesByNameAndApiId(
    apiId: string,
    scopeNames: string[]
  ): Promise<ApiScope[]> {
    return this.db.query.apiScopes.findMany({
      where: and(
        eq(schema.apiScopes.apiId, apiId),
        inArray(schema.apiScopes.name, scopeNames)
      ),
    });
  }

  async createScope(params: CreateApiScopeParams): Promise<{ id: string }> {
    const apiScopeId = uid("api_scope");

    await this.db.insert(schema.apiScopes).values({
      id: apiScopeId,
      ...params,
    });

    return { id: apiScopeId };
  }

  async createScopes(
    params: CreateApiScopeParams[]
  ): Promise<{ id: string }[]> {
    return this.db
      .insert(schema.apiScopes)
      .values(params.map((p) => ({ ...p, id: uid("api_scope") })))
      .returning({ id: schema.apiScopes.id });
  }

  async getScopeById(id: string): Promise<ApiScope | null> {
    const scope = await this.db.query.apiScopes.findFirst({
      where: eq(schema.apiScopes.id, id),
    });

    return scope ?? null;
  }

  async deleteScopeById(id: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(schema.apiScopes).where(eq(schema.apiScopes.id, id));
      await tx
        .delete(schema.clientScopes)
        .where(eq(schema.clientScopes.apiScopeId, id));
    });
  }
}
