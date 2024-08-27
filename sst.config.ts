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
        handler: "packages/lambdas/src/handle-invoice-cron.handler",
        link: [messageQueue],
        timeout: "15 minutes",
      },
      schedule: "cron(0 12 1 * ? *)",
    });

    const api = new sst.aws.ApiGatewayV2("Api", {
      accessLog: {
        retention: "1 week",
      },
    });

    api.route("ANY /{proxy+}", {
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
      // only transform if not dev because in dev a stub function is used which needs different permissions
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

    return {
      BucketDomain: bucket.domain,
    };
  },
});
