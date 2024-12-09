import { bucket } from "./bucket";
import { jwksCloudfront } from "./jwks";
import { kmsKey } from "./kms";
import { messageQueue } from "./queue";
import { schedulerDLQ, schedulerRole } from "./scheduler";
import { secrets } from "./secrets";

export const apiFn = new sst.aws.Function("CoreApi", {
  handler: "packages/api/src/index.handler",
  logging: { retention: "1 week" },
  environment: {
    JWKS_BASE_URL: jwksCloudfront.url,
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
    secrets.StripeProProductId,
    secrets.StripeGenerationsProductId,
    secrets.StripeVerificationsProductId,
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
    link: [secrets.DbUrl, secrets.AxiomApiKey],
    timeout: "10 minutes",
    logging: { retention: "1 month" }, // keep these a big logger since these are the only logs we don't send to axiom
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

new sst.aws.Cron("InvoiceAndPlanChangeCron", {
  job: {
    handler:
      "packages/lambdas/src/cron/handle-invoice-and-plan-change-cron.handler",
    link: [messageQueue, secrets.DbUrl, secrets.OptraWorkspaceId],
    timeout: "15 minutes",
  },
  schedule: "cron(0 12 1 * ? *)",
});

const supabaseCustomAccessTokenHook = new sst.aws.Function(
  "SupabaseCustomAccessTokenHook",
  {
    handler: "packages/lambdas/src/supabase/custom-access-token-hook.handler",
    environment: {
      AWS_KMS_KEY_ARN: kmsKey.arn,
    },
    link: [
      secrets.DbUrl,
      secrets.SupabaseWebhookSecret,
      secrets.AWSAccessKeyId,
      secrets.AWSSecretAccessKey,
      // these are not used by the lambda but it's a dependency of using the worksapce repo which this does use.
      secrets.StripeProProductId,
      secrets.StripeGenerationsProductId,
      secrets.StripeVerificationsProductId,
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
        ],
      },
    },
  }
);

export const outputs = {
  ApiUrl: apiFn.url,
  SupabaseCustomAccessTokenHookUrl: supabaseCustomAccessTokenHook.url,
};
