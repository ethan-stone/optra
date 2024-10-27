import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import { uid } from "./uid";

export type SigningSecret = typeof schema.signingSecrets.$inferSelect;
export type CreateSigningSecretParams = Omit<
  typeof schema.signingSecrets.$inferInsert,
  "id"
>;

export type RotateApiSigningSecretParams = {
  apiId: string;
  encryptedSigningSecret: string;
  iv: string;
  algorithm: "hsa256" | "rsa256";
  expiresAt: Date;
};

export interface SigningSecretRepo {
  getById(id: string): Promise<SigningSecret | null>;
  create(params: CreateSigningSecretParams): Promise<{ id: string }>;
  rotate(params: RotateApiSigningSecretParams): Promise<{ id: string }>;
}

export class DrizzleSigningSecretRepo implements SigningSecretRepo {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getById(id: string): Promise<SigningSecret | null> {
    const secret = await this.db.query.signingSecrets.findFirst({
      where: eq(schema.signingSecrets.id, id),
    });

    return secret ?? null;
  }

  async create(params: CreateSigningSecretParams): Promise<{ id: string }> {
    const id = uid("ssk");
    const now = new Date();

    await this.db.insert(schema.signingSecrets).values({
      id,
      workspaceId: params.workspaceId,
      secret: params.secret,
      iv: params.iv,
      algorithm: params.algorithm,
      status: params.status,
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  }

  async rotate(params: RotateApiSigningSecretParams): Promise<{ id: string }> {
    const api = await this.db.query.apis.findFirst({
      where: eq(schema.apis.id, params.apiId),
    });

    if (!api) throw new Error(`Could not find api ${params.apiId}`);

    const signingSecretId = uid("ssk");

    const now = new Date();

    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.signingSecrets)
        .set({ expiresAt: params.expiresAt })
        .where(eq(schema.signingSecrets.id, api.currentSigningSecretId));

      await tx.insert(schema.signingSecrets).values({
        id: signingSecretId,
        workspaceId: api.workspaceId,
        secret: params.encryptedSigningSecret,
        algorithm: params.algorithm,
        iv: params.iv,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });

      await tx
        .update(schema.apis)
        .set({
          nextSigningSecretId: signingSecretId,
        })
        .where(eq(schema.apis.id, params.apiId));
    });

    return { id: signingSecretId };
  }

  async expire(apiId: string, signingSecretId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const api = await tx.query.apis.findFirst({
        where: (table, { and, eq, isNull }) =>
          and(
            eq(table.id, apiId),
            eq(table.currentSigningSecretId, signingSecretId),
            isNull(table.deletedAt)
          ),
      });

      if (!api) {
        throw new Error(
          `Could not find api ${apiId} with signing secret ${signingSecretId}`
        );
      }

      if (!api.nextSigningSecretId) {
        throw new Error(`Api ${api.id} does not have a nextSigningSecretId`);
      }

      await tx
        .update(schema.apis)
        .set({
          currentSigningSecretId: api.nextSigningSecretId,
          nextSigningSecretId: null,
        })
        .where(eq(schema.apis.id, api.id));

      await tx
        .update(schema.signingSecrets)
        .set({
          status: "revoked",
          deletedAt: new Date(),
        })
        .where(eq(schema.signingSecrets.id, signingSecretId));
    });
  }
}
