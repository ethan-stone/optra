import { bucket } from "./bucket";
import { kmsKey } from "./kms";
import { messageQueue } from "./queue";
import { schedulerDLQ, schedulerRole } from "./scheduler";
import { secrets } from "./secrets";

export const apiUser = aws.iam.getUserOutput({
  userName: "optra-api-user",
});

export const apiPolicy = new aws.iam.Policy("ApiPolicy", {
  policy: bucket.arn.apply((arn) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["s3:PutObject", "s3:PutObjectAcl"],
          Resource: `${arn}/*`,
        },
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
    })
  ),
});

new aws.iam.UserPolicyAttachment("ApiUserPolicyAttachment", {
  user: apiUser.userName,
  policyArn: apiPolicy.arn,
});

export const apiFn = new sst.aws.Function("Api", {
  handler: "packages/api/src/index.handler",
  environment: {
    AWS_S3_PUBLIC_URL: bucket.domain,
    ENVIRONMENT: "development",
    AWS_KMS_KEY_ARN: kmsKey.arn,
    AWS_MESSAGE_QUEUE_ARN: messageQueue.arn,
    AWS_MESSAGE_QUEUE_URL: messageQueue.url,
    AWS_SCHEDULER_ROLE_ARN: schedulerRole.arn,
    AWS_SCHEDULER_FAILED_DLQ: schedulerDLQ.arn,
  },
  link: [
    secrets.DbUrl,
    bucket,
    messageQueue,
    secrets.AWSAccessKeyId,
    secrets.AWSSecretAccessKey,
  ],
  url: true,
  transform: !$dev && {
    role: {
      inlinePolicies: [
        {
          name: "KMSAccess",
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
            ],
          }),
        },
        {
          name: "SchedulerAccess",
          policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Action: ["scheduler:CreateSchedule", "iam:PassRole"],
                Resource: "*",
              },
            ],
          }),
        },
      ],
    },
  },
});

// only deploy the subscription filter in non-dev environments since
// in dev mode it is the stub lambda that is deployed
if (!$dev) {
  const logHandler = new sst.aws.Function("LogHandler", {
    handler: "packages/lambdas/src/cloudwatch/api-logs-handler.handler",
    link: [secrets.DbUrl, secrets.BaselimeApiKey],
    timeout: "10 minutes",
  });

  const permission = new aws.lambda.Permission("ApiPermission", {
    action: "lambda:InvokeFunction",
    function: logHandler.name,
    principal: "logs.amazonaws.com",
  });

  new aws.cloudwatch.LogSubscriptionFilter(
    "ApiLogSubscriptionFilter",
    {
      logGroup: apiFn.nodes.logGroup,
      filterPattern: "",
      destinationArn: logHandler.arn,
      name: "ApiLogSubscriptionFilter",
    },
    {
      dependsOn: [permission],
    }
  );
}

new sst.aws.Cron("InvoiceCron", {
  job: {
    handler: "packages/lambdas/src/cron/handle-invoice-cron.handler",
    link: [messageQueue, secrets.DbUrl],
    timeout: "15 minutes",
  },
  schedule: "cron(0 12 1 * ? *)",
});

export const outputs = {
  ApiUrl: apiFn.url,
};
