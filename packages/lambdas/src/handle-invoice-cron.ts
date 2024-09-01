import { ScheduledHandler } from "aws-lambda";
import { sqsClient } from "./sqs";
import {
  SendMessageBatchCommand,
  SendMessageBatchRequestEntry,
} from "@aws-sdk/client-sqs";
import { InvoiceWorkspaceEvent } from "@optra/events/event-schemas";
import { Resource } from "sst";
import { getDrizzle } from "@optra/core/drizzle";
import { DrizzleWorkspaceRepo } from "@optra/core/workspaces";
import { DrizzleIdempotencyKeyRepo } from "@optra/core/idempotency-keys";

export const handler: ScheduledHandler = async (event) => {
  const { db } = await getDrizzle(Resource.DbUrl.value);
  const workspaces = new DrizzleWorkspaceRepo(db);
  const idempotencyKeyRepo = new DrizzleIdempotencyKeyRepo(db);

  const idempotencyKey = await idempotencyKeyRepo.getByKey(event.id);

  if (idempotencyKey !== null) {
    console.log(`Skipping event ${event.id} because it was already processed`);
    return;
  }

  console.log("Queueing invoice generation for all workspaces");

  const workspacesArray = await workspaces.getBillableWorkspaces();

  console.log(`Found ${workspacesArray.length} workspaces to invoice`);

  const now = new Date();
  now.setUTCMonth(now.getUTCMonth() - 1);
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  const messages: InvoiceWorkspaceEvent[] = [];
  const messagesThatFailedSchemaValidation: Record<string, unknown>[] = [];

  console.log(`Validating messages`);

  for (const workspace of workspacesArray) {
    const msg: InvoiceWorkspaceEvent = {
      eventType: "workspace.invoice",
      payload: {
        month: month,
        year: year,
        workspaceId: workspace.workspaceId,
      },
      timestamp: Date.now(),
    };

    const parseResult = InvoiceWorkspaceEvent.safeParse(msg);

    if (parseResult.success) {
      messages.push(parseResult.data);
    } else {
      messagesThatFailedSchemaValidation.push(msg);
    }
  }

  console.log(
    `Queuing ${messages.length} invoice events and skipping ${messagesThatFailedSchemaValidation.length} events that failed schema validation`
  );

  const batches = chunkArray(messages, 10);

  let failedMessages: string[] = [];

  for (const batch of batches) {
    const batchFailedMessages = await sendBatch(
      batch.map((msg) => JSON.stringify(msg)),
      0
    );
    failedMessages = failedMessages.concat(batchFailedMessages);
  }

  if (messagesThatFailedSchemaValidation.length > 0) {
    console.error(
      `Skipped ${messagesThatFailedSchemaValidation.length} messages that failed schema validation`
    );
    console.error(
      `Failed schema validation:`,
      messagesThatFailedSchemaValidation
    );
  }

  if (failedMessages.length > 0) {
    console.error(`Failed to send ${failedMessages.length} messages`);
    console.error(`Failed messages:`, failedMessages);
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Set expiration to 7 days from now
  await idempotencyKeyRepo.create({
    key: event.id,
    expiresAt,
    createdAt: new Date(),
  });

  console.log("Done queueing invoice generation for all workspaces");
};

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

async function sendBatch(
  messages: string[],
  attempt: number
): Promise<string[]> {
  const entries = messages.map<SendMessageBatchRequestEntry>(
    (message, index) => ({
      Id: index.toString(),
      MessageBody: message,
    })
  );

  try {
    const command = new SendMessageBatchCommand({
      Entries: entries,
      QueueUrl: Resource.MessageDLQ.url,
    });

    const res = await sqsClient.send(command);

    const failed =
      res.Failed?.map((failed) => messages[parseInt(failed.Id as string)]) ??
      [];

    if (failed.length > 0 && attempt < 3) {
      console.log(`Retrying failed messages, attempt ${attempt + 1}`);
      return await sendBatch(failed, attempt + 1);
    } else {
      return failed;
    }
  } catch (error) {
    if (attempt < 3) {
      console.log(
        `Error sending batch, retrying attempt ${attempt + 1}`,
        error
      );
      return await sendBatch(messages, attempt + 1);
    } else {
      console.error(`Failed to send batch of messages`, error);

      return messages;
    }
  }
}
