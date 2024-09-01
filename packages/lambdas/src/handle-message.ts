import { EventSchemas } from "@optra/events/event-schemas";
import { SQSHandler } from "aws-lambda";
import { expireApiSigningSecret } from "./expire-api-signing-secret";
import { expireClientSecret } from "./expire-client-secret";
import { invoiceWorkspace } from "./invoice-workspace";
import { getDrizzle } from "@optra/core/drizzle";
import { DrizzleSigningSecretRepo } from "@optra/core/signing-secrets";
import { Resource } from "sst";
import { DrizzleClientSecretRepo } from "@optra/core/client-secrets";
import { DrizzleWorkspaceRepo } from "@optra/core/workspaces";
import { DrizzleIdempotencyKeyRepo } from "@optra/core/idempotency-keys";

export const handler: SQSHandler = async (event) => {
  const { db } = await getDrizzle(Resource.DbUrl.value);

  const signingSecretRepo = new DrizzleSigningSecretRepo(db);
  const clientSecretRepo = new DrizzleClientSecretRepo(db);
  const workspaceRepo = new DrizzleWorkspaceRepo(db);
  const idempotencyKeyRepo = new DrizzleIdempotencyKeyRepo(db);

  const failedMessageIds: string[] = [];

  for (const record of event.Records) {
    try {
      const parsedBody = JSON.parse(record.body);

      const validatedResult = EventSchemas.parse(parsedBody);

      let idempotencyKey: string | undefined = undefined;

      if (validatedResult.eventType === "api.signing_secret.expired") {
        if ((await idempotencyKeyRepo.getByKey(record.messageId)) !== null) {
          console.log(
            `Skipping signing secret expired message ${record.messageId} because it was already processed`
          );
          continue;
        }

        idempotencyKey = record.messageId;

        await expireApiSigningSecret(
          {
            apiId: validatedResult.payload.apiId,
            signingSecretId: validatedResult.payload.signingSecretId,
          },
          {
            signingSecretRepo,
          }
        );
      }

      if (validatedResult.eventType === "client.secret.expired") {
        if ((await idempotencyKeyRepo.getByKey(record.messageId)) !== null) {
          console.log(
            `Skipping client secret expired message ${record.messageId} because it was already processed`
          );
          continue;
        }

        idempotencyKey = record.messageId;

        await expireClientSecret(
          {
            clientId: validatedResult.payload.clientId,
            clientSecretId: validatedResult.payload.clientSecretId,
          },
          {
            clientSecretRepo,
          }
        );
      }

      if (validatedResult.eventType === "workspace.invoice") {
        if (
          await idempotencyKeyRepo.getByKey(
            `${validatedResult.payload.workspaceId}-${validatedResult.payload.year}-${validatedResult.payload.month}`
          )
        ) {
          console.log(
            `Skipping invoice workspace message ${record.messageId} because it was already processed`
          );
          continue;
        }

        idempotencyKey = `${validatedResult.payload.workspaceId}-${validatedResult.payload.year}-${validatedResult.payload.month}`;

        await invoiceWorkspace(
          {
            month: validatedResult.payload.month,
            workspaceId: validatedResult.payload.workspaceId,
            year: validatedResult.payload.year,
          },
          {
            workspaceRepo,
          }
        );
      }

      if (idempotencyKey !== undefined)
        await idempotencyKeyRepo.create({
          key: idempotencyKey,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          createdAt: new Date(),
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
