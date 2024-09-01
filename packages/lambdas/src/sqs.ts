import { DeleteMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { Resource } from "sst";

export const sqsClient = new SQSClient({
  region: "us-east-1",
});

export async function deleteMessage(receiptHandle: string): Promise<void> {
  await sqsClient.send(
    new DeleteMessageCommand({
      QueueUrl: Resource.MessageQueue.url,
      ReceiptHandle: receiptHandle,
    })
  );
}
