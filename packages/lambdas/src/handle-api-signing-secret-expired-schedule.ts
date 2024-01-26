import { ApiSigningSecretExpiredScheduledEvent } from "@optra/core/api-signing-secret-expired-scheduled-event";
import { connect } from "@planetscale/database";
import { drizzle } from "drizzle-orm/planetscale-serverless";
import * as schema from "@optra/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { Config } from "sst/node/config";
import { SQSEvent } from "aws-lambda";
import { DeleteMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

const sqsClient = new SQSClient({
  region: "us-east-1",
});

const connection = connect({
  url: Config.DRIZZLE_DATABASE_URL,
});

const db = drizzle(connection, {
  schema: schema,
});

export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    let parsedBody: Record<string, unknown> | null = null;

    try {
      parsedBody = JSON.parse(record.body);
    } catch (error) {
      console.error(error);
      continue;
    }

    const validateResult =
      ApiSigningSecretExpiredScheduledEvent.safeParse(parsedBody);

    if (!validateResult.success) {
      console.error(validateResult.error);

      continue;
    }

    const { secretId } = validateResult.data;

    await db.transaction(async (tx) => {
      const api = await tx.query.apis.findFirst({
        where: and(
          eq(schema.apis.currentSigningSecretId, secretId),
          isNull(schema.apis.deletedAt)
        ),
      });

      if (!api) {
        throw new Error(`Could not find api with secret ${secretId}`);
      }

      if (!api.nextSigningSecretId) {
        throw new Error(`Api ${api.id} does not have a nextSigningSecretId`);
      }

      await tx.update(schema.apis).set({
        currentSigningSecretId: api.nextSigningSecretId,
        nextSigningSecretId: null,
      });

      await tx.update(schema.signingSecrets).set({
        status: "revoked",
        deletedAt: new Date(),
      });
    });

    await sqsClient.send(
      new DeleteMessageCommand({
        QueueUrl: "TODO",
        ReceiptHandle: record.receiptHandle,
      })
    );
  }
};
