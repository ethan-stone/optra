import { StackContext, Function, Config, Queue } from "sst/constructs";
import * as iam from "aws-cdk-lib/aws-iam";

export function SchedulerStack({ stack }: StackContext) {
  const DRIZZLE_DATABASE_URL = new Config.Secret(stack, "DRIZZLE_DATABASE_URL");

  const optraApiUser = iam.User.fromUserArn(
    stack,
    "OptraApiUser",
    "arn:aws:iam::475216627762:user/optra-api-user"
  );

  optraApiUser.addToPrincipalPolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["scheduler:CreateSchedule", "iam:PassRole"],
      resources: ["*"],
    })
  );

  // right now for simplicity we are using the same queue for all events
  // if necessary we can create a queue for each event type

  // dlq if handling an event fails
  const messageDLQ = new Queue(stack, "MessageDLQ", {});

  // queue to handle secret expired events
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

  // dlq if event bridge scheduler fails to send message to the SecretExpiredQueue
  const schedulerFailedDLQ = new Queue(stack, "SchedulerFailedDLQ", {});

  const schedulerRole = new iam.Role(stack, "SchedulerRole", {
    assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com"),
  });

  const MESSAGE_QUEUE_URL = new Config.Parameter(stack, "MESSAGE_QUEUE_URL", {
    value: messageQueue.queueUrl,
  });

  const handleSecretExpired = new Function(
    stack,
    "HandleSecretExpiredSchedule",
    {
      bind: [DRIZZLE_DATABASE_URL, MESSAGE_QUEUE_URL],
      handler:
        "packages/lambdas/src/handle-client-secret-expired-schedule.handler",
    }
  );

  messageQueue.addConsumer(stack, {
    function: handleSecretExpired,
  });

  messageQueue.cdk.queue.grantConsumeMessages(handleSecretExpired);
  messageQueue.cdk.queue.grantSendMessages(schedulerRole);
  schedulerFailedDLQ.cdk.queue.grantSendMessages(schedulerRole);

  stack.addOutputs({
    HandleSecretExpiredArn: handleSecretExpired.functionArn,
    SchedulerRoleArn: schedulerRole.roleArn,
    MessageQueue: messageQueue.queueArn,
    MessageDLQ: messageDLQ.queueArn,
    SchedulerFailedDLQ: schedulerFailedDLQ.queueArn,
  });
}
