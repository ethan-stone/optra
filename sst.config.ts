/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "optra",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          profile: "admin-personal",
        },
      },
    };
  },
  async run() {
    const apiUser = await aws.iam.getUser({
      userName: "optra-api-user",
    });

    const kmsKey = await aws.kms.getKey({
      keyId:
        "arn:aws:kms:us-east-1:475216627762:key/59582df9-5519-4700-953b-dcdc6f696f48",
    });

    const messageDLQ = new sst.aws.Queue("MessageDLQ", {});

    const messageQueue = new sst.aws.Queue("MessageQueue", {
      dlq: messageDLQ.arn,
    });

    messageQueue.subscribe("packages/lambdas/src/handle-message.handler", {
      transform: {
        eventSourceMapping: {
          functionResponseTypes: ["ReportBatchItemFailures"],
        },
      },
    });

    const schedulerDLQ = new sst.aws.Queue("SchedulerFailedDLQ", {});

    const schedulerRole = new aws.iam.Role("SchedulerRole", {
      assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
        Service: "scheduler.amazonaws.com",
      }),
    });

    const schedulerDLQSendMessagePolicy = new aws.iam.Policy(
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

    new aws.iam.RolePolicyAttachment("SchedulerRoleAttachment", {
      role: schedulerRole.name,
      policyArn: schedulerDLQSendMessagePolicy.arn,
    });

    const apiPolicy = new aws.iam.Policy("ApiPolicy", {
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "kms:Encrypt",
              "kms:Decrypt",
              "kms:ReEncrypt*",
              "kms:GenerateDataKey*",
              "kms:DescribeKey",
            ],
            Resource: "*",
          },
          {
            Effect: "Allow",
            Action: ["scheduler:CreateSchedule", "iam:PassRole"],
            Resource: "*",
          },
        ],
      }),
    });

    new aws.iam.UserPolicyAttachment("ApiUserPolicyAttachment", {
      user: apiUser.userName,
      policyArn: apiPolicy.arn,
    });

    new sst.aws.Cron("InvoiceCron", {
      job: {
        handler: "packages/lambdas/src/handle-invoice-cron.handler",
        link: [messageQueue],
        timeout: "15 minutes",
      },
      schedule: "cron(0 12 1 * ? *)",
    });

    return {
      KMSKeyArn: kmsKey.arn,
      APIUserArn: apiUser.arn,
      MessageQueueArn: messageQueue.arn,
      MessageDLQArn: messageDLQ.arn,
      SchedulerRoleArn: schedulerRole.arn,
      SchedulerDLQArn: schedulerDLQ.arn,
    };
  },
});
