import { EventSchemas } from "@optra/core/event-schemas";
import { Config } from "sst/node/config";
import { SQSHandler } from "aws-lambda";
import { DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { expireApiSigningSecret } from "./expire-api-signing-secret";
import { expireClientSecret } from "./expire-client-secret";
import { sqsClient } from "./sqs";

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
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
      throw new Error("Not implemented");
    }

    await sqsClient.send(
      new DeleteMessageCommand({
        QueueUrl: Config.MESSAGE_QUEUE_URL,
        ReceiptHandle: record.receiptHandle,
      })
    );
  }
};
