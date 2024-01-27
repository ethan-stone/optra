import { Queue, StackContext, Function, Config } from "sst/constructs";

export function MessageQueueStack({ stack }: StackContext) {
  const DRIZZLE_DATABASE_URL = new Config.Secret(stack, "DRIZZLE_DATABASE_URL");

  // right now for simplicity we are using the same queue for all events
  // if necessary we can create a queue for each event type

  // dlq for handling an event failures
  const messageDLQ = new Queue(stack, "MessageDLQ", {});

  // queue to handle events
  const messageQueue = new Queue(stack, "MessageQueue", {
    cdk: {
      queue: {
        deadLetterQueue: {
          queue: messageDLQ.cdk.queue,
          maxReceiveCount: 3,
        },
      },
    },
  });

  const MESSAGE_QUEUE_URL = new Config.Parameter(stack, "MESSAGE_QUEUE_URL", {
    value: messageQueue.queueUrl,
  });

  const handleMessage = new Function(stack, "HandleSecretExpiredSchedule", {
    bind: [DRIZZLE_DATABASE_URL, MESSAGE_QUEUE_URL],
    handler: "packages/lambdas/src/handle-message.handler",
  });

  messageQueue.addConsumer(stack, {
    function: handleMessage,
  });

  messageQueue.cdk.queue.grantConsumeMessages(handleMessage);

  stack.addOutputs({
    HandleMessageFunction: handleMessage.functionArn,
    MessageQueue: messageQueue.queueArn,
    MessageDLQ: messageDLQ.queueArn,
  });

  return {
    messageQueue,
    messageDLQ,
  };
}
