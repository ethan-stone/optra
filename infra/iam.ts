import { bucket } from "./bucket";

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
        {
          Effect: "Allow",
          Action: ["ses:SendEmail"],
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
