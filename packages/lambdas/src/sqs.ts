import { DeleteMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { Config } from "sst/node/config";

export const sqsClient = new SQSClient({
  region: "us-east-1",
});

export async function deleteMessage(receiptHandle: string): Promise<void> {
  await sqsClient.send(
    new DeleteMessageCommand({
      QueueUrl: Config.MESSAGE_QUEUE_URL,
      ReceiptHandle: receiptHandle,
    })
  );
}
