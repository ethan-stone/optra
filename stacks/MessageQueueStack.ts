import {
  Queue,
  StackContext,
  Function,
  Config,
  Table,
  use,
} from "sst/constructs";
import { ParametersStack } from "./ParametersStack";
import { DynamoDBStack } from "./DynamoDBStack";

export function MessageQueueStack({ stack }: StackContext) {
  const {
    DRIZZLE_DATABASE_URL,
    STRIPE_API_KEY,
    TINY_BIRD_API_KEY,
    TINY_BIRD_BASE_URL,
    TINY_BIRD_MONTHLY_GENERATIONS_ENDPOINT,
    TINY_BIRD_MONTHLY_VERIFICATIONS_ENDPOINT,
  } = use(ParametersStack);
  const { idempotencyKeyTable } = use(DynamoDBStack);

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
  };
}
