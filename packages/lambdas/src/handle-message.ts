import { EventSchemas } from "@optra/core/event-schemas";
import { SQSHandler } from "aws-lambda";
import { expireApiSigningSecret } from "./expire-api-signing-secret";
import { expireClientSecret } from "./expire-client-secret";
import { invoiceWorkspace } from "./invoice-workspace";
import { getIdempotencyKey, putIdempotencyKey } from "./dynamodb";

export const handler: SQSHandler = async (event) => {
  const failedMessageIds: string[] = [];

  for (const record of event.Records) {
    try {
      const parsedBody = JSON.parse(record.body);

      const validatedResult = EventSchemas.parse(parsedBody);

      let idempotencyKey: string | undefined = undefined;

      if (validatedResult.eventType === "api.signing_secret.expired") {
        if ((await getIdempotencyKey(record.messageId)) !== null) {
          console.log(
            `Skipping signing secret expired message ${record.messageId} because it was already processed`
          );
          continue;
        }

        idempotencyKey = record.messageId;

        await expireApiSigningSecret({
          apiId: validatedResult.payload.apiId,
          signingSecretId: validatedResult.payload.signingSecretId,
        });
      }

      if (validatedResult.eventType === "client.secret.expired") {
        if ((await getIdempotencyKey(record.messageId)) !== null) {
          console.log(
            `Skipping client secret expired message ${record.messageId} because it was already processed`
          );
          continue;
        }

        idempotencyKey = record.messageId;

        await expireClientSecret({
          clientId: validatedResult.payload.clientId,
          clientSecretId: validatedResult.payload.clientSecretId,
        });
      }

      if (validatedResult.eventType === "workspace.invoice") {
        if (
          await getIdempotencyKey(
            `${validatedResult.payload.workspaceId}-${validatedResult.payload.year}-${validatedResult.payload.month}`
          )
        ) {
          console.log(
            `Skipping invoice workspace message ${record.messageId} because it was already processed`
          );
          continue;
        }

        idempotencyKey = `${validatedResult.payload.workspaceId}-${validatedResult.payload.year}-${validatedResult.payload.month}`;

        await invoiceWorkspace({
          month: validatedResult.payload.month,
          workspaceId: validatedResult.payload.workspaceId,
          year: validatedResult.payload.year,
        });
      }

      if (idempotencyKey !== undefined) await putIdempotencyKey(idempotencyKey);
    } catch (error) {
      console.error("Failed to process message", error);
      failedMessageIds.push(record.messageId);
    }
  }

  return {
    batchItemFailures: failedMessageIds.map((messageId) => ({
      itemIdentifier: messageId,
    })),
  };
};
