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
      const idempotencyKey = await getIdempotencyKey(record.messageId);

      if (idempotencyKey !== null) {
        console.log(
          `Skipping message ${record.messageId} because it was already processed`
        );
        continue;
      }

      const parsedBody = JSON.parse(record.body);

      const validatedResult = EventSchemas.parse(parsedBody);

      if (validatedResult.eventType === "api.signing_secret.expired") {
        await expireApiSigningSecret({
          apiId: validatedResult.payload.apiId,
          signingSecretId: validatedResult.payload.signingSecretId,
        });
      }

      if (validatedResult.eventType === "client.secret.expired") {
        await expireClientSecret({
          clientId: validatedResult.payload.clientId,
          clientSecretId: validatedResult.payload.clientSecretId,
        });
      }

      if (validatedResult.eventType === "workspace.invoice") {
        await invoiceWorkspace({
          month: validatedResult.payload.month,
          workspaceId: validatedResult.payload.workspaceId,
          year: validatedResult.payload.year,
        });
      }

      await putIdempotencyKey(record.messageId);
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
