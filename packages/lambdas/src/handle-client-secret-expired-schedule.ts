import { ClientSecretExpiredScheduledEvent } from "@optra/core/client-secret-expired-scheduled-event";
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

    const validatedResult =
      ClientSecretExpiredScheduledEvent.safeParse(parsedBody);

    if (!validatedResult.success) {
      console.error(validatedResult.error);
      continue;
    }

    const { secretId } = validatedResult.data;

    await db.transaction(async (tx) => {
      const client = await tx.query.clients.findFirst({
        where: and(
          eq(schema.clients.currentClientSecretId, secretId),
          isNull(schema.clients.deletedAt)
        ),
      });

      if (!client) {
        throw new Error(`Could not find client with secret ${secretId}`);
      }

      if (!client.nextClientSecretId) {
        throw new Error(
          `Client ${client.id} does not have a nextClientSecretId`
        );
      }

      await tx
        .update(schema.clients)
        .set({
          currentClientSecretId: client.nextClientSecretId,
          nextClientSecretId: null,
        })
        .where(eq(schema.clients.id, client.id));

      await tx
        .update(schema.clientSecrets)
        .set({
          status: "revoked",
          deletedAt: new Date(),
        })
        .where(eq(schema.clientSecrets.id, secretId));
    });

    await sqsClient.send(
      new DeleteMessageCommand({
        QueueUrl: Config.SECRET_EXPIRED_MESSAGE_QUEUE_URL,
        ReceiptHandle: record.receiptHandle,
      })
    );

    console.log(`Revoked secret ${secretId}`);
  }
};
