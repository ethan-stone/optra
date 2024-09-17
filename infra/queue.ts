import { secrets } from "./secrets";

export const messageDLQ = new sst.aws.Queue("MessageDLQ", {});

export const messageQueue = new sst.aws.Queue("MessageQueue", {
  dlq: messageDLQ.arn,
});

messageQueue.subscribe(
  {
    handler: "packages/lambdas/src/sqs/handle-message.handler",
    link: [secrets.StripeApiKey, secrets.DbUrl],
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
