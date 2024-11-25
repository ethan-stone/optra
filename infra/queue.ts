import { secrets } from "./secrets";

export const messageDLQ = new sst.aws.Queue("MessageDLQ", {
  fifo: true,
});

export const messageQueue = new sst.aws.Queue("MessageQueue", {
  dlq: messageDLQ.arn,
  fifo: true,
});

messageQueue.subscribe(
  {
    handler: "packages/lambdas/src/sqs/handle-message.handler",
    link: [
      secrets.StripeApiKey,
      secrets.StripeProProductId,
      secrets.StripeGenerationsProductId,
      secrets.StripeVerificationsProductId,
      secrets.DbUrl,
      secrets.OptraWorkspaceId,
    ],
  },
  {
    transform: {
      eventSourceMapping: {
        functionResponseTypes: ["ReportBatchItemFailures"],
      },
    },
  }
);

export const outputs = {
  MessageQueueUrl: messageQueue.url,
  MessageDLQUrl: messageDLQ.url,
};
