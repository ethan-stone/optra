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

  // dlq if handling of secret expired events fails
  const secretExpiredMessageDLQ = new Queue(
    stack,
    "SecretExpiredMessageDLQ",
    {}
  );

  // queue to handle secret expired events
  const secretExpiredMessageQueue = new Queue(
    stack,
    "SecretExpiredMessageQueue",
    {
      cdk: {
        queue: {
          deadLetterQueue: {
            queue: secretExpiredMessageDLQ.cdk.queue,
            maxReceiveCount: 3,
          },
        },
      },
    }
  );

  // dlq if event bridge scheduler fails to send message to the SecretExpiredQueue
  const scheduleFailedDLQ = new Queue(
    stack,
    "SecretExpiredScheduleFailedDLQ",
    {}
  );

  const schedulerRole = new iam.Role(stack, "SchedulerRole", {
    assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com"),
  });

  const SECRET_EXPIRED_MESSAGE_QUEUE_URL = new Config.Parameter(
    stack,
    "SECRET_EXPIRED_MESSAGE_QUEUE_URL",
    {
      value: secretExpiredMessageQueue.queueUrl,
    }
  );

  const handleSecretExpired = new Function(
    stack,
    "HandleSecretExpiredSchedule",
    {
      bind: [DRIZZLE_DATABASE_URL, SECRET_EXPIRED_MESSAGE_QUEUE_URL],
      handler: "packages/lambdas/src/handle-secret-expired-schedule.handler",
    }
  );

  secretExpiredMessageQueue.addConsumer(stack, {
    function: handleSecretExpired,
  });

  secretExpiredMessageQueue.cdk.queue.grantConsumeMessages(handleSecretExpired);
  secretExpiredMessageQueue.cdk.queue.grantSendMessages(schedulerRole);
  scheduleFailedDLQ.cdk.queue.grantSendMessages(schedulerRole);

  stack.addOutputs({
    HandleSecretExpiredArn: handleSecretExpired.functionArn,
    SchedulerRoleArn: schedulerRole.roleArn,
    SecretExpiredMessageQueue: secretExpiredMessageQueue.queueArn,
    SecretExpiredMessageDLQ: secretExpiredMessageDLQ.queueArn,
    ScheduleFailedDLQ: scheduleFailedDLQ.queueArn,
  });
}
