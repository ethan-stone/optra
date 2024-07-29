import { EventSchemas } from "@optra/core/event-schemas";
import { SQSHandler } from "aws-lambda";
import { expireApiSigningSecret } from "./expire-api-signing-secret";
import { expireClientSecret } from "./expire-client-secret";
import { invoiceWorkspace } from "./invoice-workspace";
import { db, schema } from "./db";

export const handler: SQSHandler = async (event) => {
  const failedMessageIds: string[] = [];

  for (const record of event.Records) {
    try {
      const parsedBody = JSON.parse(record.body);

      const validatedResult = EventSchemas.parse(parsedBody);

      const idempotencyKey =
        validatedResult.eventType === "workspace.invoice"
          ? `${validatedResult.payload.workspaceId}-${validatedResult.payload.year}-${validatedResult.payload.month}`
          : record.messageId;

      // Find an idempotencyKey with the matching ID that has an expiration
      // date greater than the current date or no expiration date at all
      const idempotencyKeyRecord = await db.query.idempotencyKeys.findFirst({
        where: (tables, { eq, and, gt, or, isNull }) =>
          and(
            or(gt(tables.expiresAt, new Date()), isNull(tables.expiresAt)),
            eq(tables.key, idempotencyKey)
          ),
      });

      if (idempotencyKeyRecord !== undefined) {
        console.log(
          `Skipping ${validatedResult.eventType} message with ID ${record.messageId} and idempotencyKey ${idempotencyKey} since it was already processed.`
        );
        continue;
      }

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

      if (validatedResult.eventType === "token.generated") {
        // do nothing for now
        console.log("Received token.generated event");
      }

      await db.insert(schema.idempotencyKeys).values({
        key: idempotencyKey,
        createdAt: new Date(),
        expiresAt:
          validatedResult.eventType === "workspace.invoice"
            ? null // For invoice events we do not want an expiration date
            : new Date(Date.now() + 1000 * 60 * 60 * 24), // For other events expire the idempotencyKey after 24 hours
      });
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
