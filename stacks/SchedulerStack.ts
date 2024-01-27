import { StackContext, Queue, use } from "sst/constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import { MessageQueueStack } from "./MessageQueueStack";

export function SchedulerStack({ stack }: StackContext) {
  const { messageQueue } = use(MessageQueueStack);

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

  // dlq if event bridge scheduler fails to send message to the MessageQueue
  const schedulerFailedDLQ = new Queue(stack, "SchedulerFailedDLQ", {});

  const schedulerRole = new iam.Role(stack, "SchedulerRole", {
    assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com"),
  });

  messageQueue.cdk.queue.grantSendMessages(schedulerRole);
  schedulerFailedDLQ.cdk.queue.grantSendMessages(schedulerRole);

  stack.addOutputs({
    SchedulerRoleArn: schedulerRole.roleArn,
    SchedulerFailedDLQ: schedulerFailedDLQ.queueArn,
  });
}
