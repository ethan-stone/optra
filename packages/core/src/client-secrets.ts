import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import { uid } from "./uid";
import { hashSHA256 } from "./crypto-utils";

export type ClientSecret = Omit<
  typeof schema.clientSecrets.$inferSelect,
  "secret"
>;
export type RotateClientSecretParams = {
  clientId: string;
  expiresAt: Date;
};

export interface ClientSecretRepo {
  getValueById(id: string): Promise<string | null>;
  getById(id: string): Promise<ClientSecret | null>;
  rotate(
    params: RotateClientSecretParams
  ): Promise<typeof schema.clientSecrets.$inferSelect>;
}

export class DrizzleClientSecretRepo implements ClientSecretRepo {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async getValueById(id: string): Promise<string | null> {
    const secret = await this.db.query.clientSecrets.findFirst({
      where: eq(schema.clientSecrets.id, id),
      columns: {
        secret: true,
      },
    });

    return secret?.secret ?? null;
  }

  async getById(id: string): Promise<ClientSecret | null> {
    const secret = await this.db.query.clientSecrets.findFirst({
      where: eq(schema.clientSecrets.id, id),
      columns: {
        secret: false,
      },
    });

    return secret ?? null;
  }

  async rotate(
    params: RotateClientSecretParams
  ): Promise<typeof schema.clientSecrets.$inferSelect> {
    const client = await this.db.query.clients.findFirst({
      where: eq(schema.clients.id, params.clientId),
    });

    if (!client) throw new Error(`Could not find client ${params.clientId}`);

    const clientSecretPrefix = client.clientSecretPrefix;

    const secretId = uid("csk");
    const secretValue = clientSecretPrefix
      ? clientSecretPrefix + "_" + uid(undefined, 48)
      : uid(undefined, 48);
    const hashedSecretValue = await hashSHA256(secretValue);

    const now = new Date();

    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.clientSecrets)
        .set({
          expiresAt: params.expiresAt,
        })
        .where(eq(schema.clientSecrets.id, client.currentClientSecretId));

      await tx.insert(schema.clientSecrets).values({
        id: secretId,
        secret: hashedSecretValue,
        status: "active",
        createdAt: now,
      });

      await tx
        .update(schema.clients)
        .set({
          version: client.version + 1,
          nextClientSecretId: secretId,
        })
        .where(eq(schema.clients.id, params.clientId));
    });

    return {
      id: secretId,
      secret: secretValue,
      status: "active",
      expiresAt: null,
      deletedAt: null,
      createdAt: now,
    };
  }
}
