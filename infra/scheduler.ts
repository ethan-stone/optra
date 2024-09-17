import { messageQueue } from "./queue";

export const schedulerDLQ = new sst.aws.Queue("SchedulerFailedDLQ", {});

export const schedulerRole = new aws.iam.Role("SchedulerRole", {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
    Service: "scheduler.amazonaws.com",
  }),
});

export const schedulerDLQSendMessagePolicy = new aws.iam.Policy(
  "SchedulerDLQQueueSendMessagePolicy",
  {
    description: "Allows sending messages to the scheduler DLQ",
    policy: schedulerDLQ.arn.apply((arn) =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Action: "sqs:SendMessage",
            Resource: arn,
            Effect: "Allow",
          },
        ],
      })
    ),
  }
);

export const schedulerMessageQueueSendMessagePolicy = new aws.iam.Policy(
  "SchedulerMessageQueueSendMessagePolicy",
  {
    description: "Allows sending messages to the message queue",
    policy: messageQueue.arn.apply((arn) =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Action: "sqs:SendMessage",
            Resource: arn,
            Effect: "Allow",
          },
        ],
      })
    ),
  }
);

new aws.iam.RolePolicyAttachment("SchedulerDLQRoleAttachment", {
  role: schedulerRole.name,
  policyArn: schedulerDLQSendMessagePolicy.arn,
});

new aws.iam.RolePolicyAttachment("SchedulerMessageQueueRoleAttachment", {
  role: schedulerRole.name,
  policyArn: schedulerMessageQueueSendMessagePolicy.arn,
});

export const outputs = {
  SchedulerRoleArn: schedulerRole.arn,
  SchedulerDLQArn: schedulerDLQ.url,
};
