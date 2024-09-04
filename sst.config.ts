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

    const awsAccessKeyId = new sst.Secret("AWSAccessKeyId");
    const awsSecretAccessKey = new sst.Secret("AWSSecretAccessKey");

    const stripeApiKey = new sst.Secret("StripeApiKey");

    const dbUrl = new sst.Secret("DbUrl");

    const tinyBirdUrl = new sst.Secret(
      "TinyBirdUrl",
      "https://api.us-east.aws.tinybird.co"
    );

    const tinyBirdVerificationsEndpoint = new sst.Secret(
      "TinyBirdVerificationsEndpoint",
      "https://api.us-east.aws.tinybird.co/v0/pipes/mv__montly_verification__v0_pipe_0905.json"
    );

    const tinyBirdGenerationsEndpoint = new sst.Secret(
      "TinyBirdGenerationsEndpoint",
      "https://api.us-east.aws.tinybird.co/v0/pipes/mv__montly_generated__v0_pipe_2798.json"
    );

    const tinyBirdApiKey = new sst.Secret("TinyBirdApiKey");

    const bucket = new sst.aws.Bucket("JwksBucket", {
      public: true,
    });

    const messageDLQ = new sst.aws.Queue("MessageDLQ", {});

    const messageQueue = new sst.aws.Queue("MessageQueue", {
      dlq: messageDLQ.arn,
    });

    messageQueue.subscribe(
      {
        handler: "packages/lambdas/src/sqs/handle-message.handler",
        link: [
          stripeApiKey,
          dbUrl,
          tinyBirdUrl,
          tinyBirdApiKey,
          tinyBirdGenerationsEndpoint,
          tinyBirdVerificationsEndpoint,
        ],
      },
      {
        transform: {
          eventSourceMapping: {
            functionResponseTypes: ["ReportBatchItemFailures"],
          },
        },
      }
    );

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

    const schedulerMessageQueueSendMessagePolicy = new aws.iam.Policy(
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

    const apiPolicy = new aws.iam.Policy("ApiPolicy", {
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

    new sst.aws.Cron("InvoiceCron", {
      job: {
        handler: "packages/lambdas/src/cron/handle-invoice-cron.handler",
        link: [messageQueue, dbUrl],
        timeout: "15 minutes",
      },
      schedule: "cron(0 12 1 * ? *)",
    });

    // TODO; add throttling to the api
    const apiFn = new sst.aws.Function("Api", {
      handler: "packages/api/src/index.handler",
      environment: {
        AWS_S3_PUBLIC_URL: bucket.domain,
        ENVIRONMENT: "development",
        AWS_KMS_KEY_ARN: kmsKey.arn,
        AWS_MESSAGE_QUEUE_ARN: messageQueue.arn,
        AWS_SCHEDULER_ROLE_ARN: schedulerRole.arn,
        AWS_SCHEDULER_FAILED_DLQ: schedulerDLQ.arn,
      },
      link: [
        dbUrl,
        bucket,
        messageQueue,
        tinyBirdUrl,
        tinyBirdApiKey,
        tinyBirdGenerationsEndpoint,
        tinyBirdVerificationsEndpoint,
        awsAccessKeyId,
        awsSecretAccessKey,
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

    const logHandler = new sst.aws.Function("LogHandler", {
      handler: "packages/lambdas/src/cloudwatch/api-logs-handler.handler",
      link: [dbUrl],
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

    new sst.aws.Router("Router", {
      routes: {
        "/*": apiFn.url,
      },
      transform: {
        cachePolicy: {
          comment:
            "Router caching policy. Caching is completely disabled for the router.",
          name: "Router-Caching-Disabled",
          maxTtl: 0,
          minTtl: 0,
          defaultTtl: 0,
          parametersInCacheKeyAndForwardedToOrigin: {
            cookiesConfig: {
              cookieBehavior: "none",
            },
            headersConfig: {
              headerBehavior: "none",
            },
            queryStringsConfig: {
              queryStringBehavior: "none",
            },
            enableAcceptEncodingBrotli: false,
            enableAcceptEncodingGzip: false,
          },
        },
      },
    });

    return {
      BucketDomain: bucket.domain,
    };
  },
});
