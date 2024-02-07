import { StackContext, Queue, use, Cron, Config } from "sst/constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import { MessageQueueStack } from "./MessageQueueStack";
import { ParametersStack } from "./ParametersStack";

export function SchedulerStack({ stack }: StackContext) {
  const { messageQueue, MESSAGE_QUEUE_URL } = use(MessageQueueStack);
  const { DRIZZLE_DATABASE_URL } = use(ParametersStack);

  // this is the user for the cloudflare worker api
  // it needs to be able to create schedules for rotating
  // client secrets and api signing secrets
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

  // CRON job for invoicing on the 1st of every month at 12:00 PM UTC
  // It will send a message to the message queue for each workspace
  // to invoice that workspace
  const invoiceCronJob = new Cron(stack, "InvoicingCron", {
    schedule: "cron(0 12 1 * ? *)",
    job: {
      function: {
        handler: "packages/lambdas/src/handle-invoice-cron.handler",
        timeout: "15 minutes",
        bind: [MESSAGE_QUEUE_URL, DRIZZLE_DATABASE_URL],
      },
    },
  });

  invoiceCronJob.jobFunction.grantInvoke(optraApiUser);
  messageQueue.cdk.queue.grantSendMessages(invoiceCronJob.jobFunction);

  stack.addOutputs({
    SchedulerRoleArn: schedulerRole.roleArn,
    SchedulerFailedDLQ: schedulerFailedDLQ.queueArn,
    InvoiceCronJobFunction: invoiceCronJob.jobFunction.functionArn,
  });
}
