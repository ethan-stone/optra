import { Queue, StackContext, Function, Config, Table } from "sst/constructs";

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

  const TINY_BIRD_API_KEY = new Config.Secret(stack, "TINY_BIRD_API_KEY");
  const TINY_BIRD_BASE_URL = new Config.Parameter(stack, "TINY_BIRD_BASE_URL", {
    value: "https://api.us-east.aws.tinybird.co",
  });
  const TINY_BIRD_MONTHLY_VERIFICATIONS_ENDPOINT = new Config.Parameter(
    stack,
    "TINY_BIRD_MONTHLY_VERIFICATIONS_ENDPOINT",
    {
      value:
        "https://api.us-east.aws.tinybird.co/v0/pipes/mv__montly_verification__v0_pipe_0905.json",
    }
  );
  const TINY_BIRD_MONTHLY_GENERATIONS_ENDPOINT = new Config.Parameter(
    stack,
    "TINY_BIRD_MONTHLY_GENERATIONS_ENDPOINT",
    {
      value:
        "https://api.us-east.aws.tinybird.co/v0/pipes/mv__montly_generated__v0_pipe_2798.json",
    }
  );

  const STRIPE_API_KEY = new Config.Secret(stack, "STRIPE_API_KEY");

  // table to store idempotency keys for the messages
  const idempotencyKeyTable = new Table(stack, "IdempotencyKeyTable", {
    fields: {
      key: "string",
      timestamp: "number",
    },
    primaryIndex: { partitionKey: "key" },
  });

  const handleMessage = new Function(stack, "HandleMessage", {
    bind: [
      DRIZZLE_DATABASE_URL,
      MESSAGE_QUEUE_URL,
      TINY_BIRD_API_KEY,
      TINY_BIRD_BASE_URL,
      TINY_BIRD_MONTHLY_VERIFICATIONS_ENDPOINT,
      TINY_BIRD_MONTHLY_GENERATIONS_ENDPOINT,
      STRIPE_API_KEY,
      idempotencyKeyTable,
    ],
    handler: "packages/lambdas/src/handle-message.handler",
  });

  messageQueue.addConsumer(stack, {
    function: handleMessage,
    cdk: {
      eventSource: {
        reportBatchItemFailures: true,
      },
    },
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
    MESSAGE_QUEUE_URL,
    DRIZZLE_DATABASE_URL,
  };
}
