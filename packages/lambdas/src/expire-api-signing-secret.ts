import { eq } from "drizzle-orm";
import { db } from "./db";
import * as schema from "@optra/db/schema";

export type ExpireApiSigningSecretArgs = {
  apiId: string;
  signingSecretId: string;
};

export async function expireApiSigningSecret(
  args: ExpireApiSigningSecretArgs
): Promise<void> {
  const { apiId, signingSecretId } = args;

  await db.transaction(async (tx) => {
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

    console.log(`Revoked api signing secret ${signingSecretId}`);
  });
}
