import { SecretExpiredScheduledEvent } from "@optra/core/secret-expired-scheduled-event";
import { connect } from "@planetscale/database";
import { drizzle } from "drizzle-orm/planetscale-serverless";
import { schema } from "@optra/db";
import { eq } from "drizzle-orm";
import { Config } from "sst/node/config";

const connection = connect({
  url: Config.DRIZZLE_DATABASE_URL,
});

const db = drizzle(connection, {
  schema: schema,
});

export const handler = async (event: unknown) => {
  const parseResult = SecretExpiredScheduledEvent.safeParse(event);

  if (!parseResult.success) {
    console.error(parseResult.error);
    return;
  }

  const { secretId } = parseResult.data;

  await db
    .update(schema.clientSecrets)
    .set({
      status: "revoked",
    })
    .where(eq(schema.clientSecrets.id, secretId));

  console.log(`Revoked secret ${secretId}`);
};
