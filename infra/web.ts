import { bucket } from "./bucket";
import { jwksCloudfront } from "./jwks";
import { kmsKey } from "./kms";
import { messageQueue } from "./queue";
import { schedulerDLQ, schedulerRole } from "./scheduler";
import { secrets } from "./secrets";

const vpc = new sst.aws.Vpc("Vpc");

const cluster = new sst.aws.Cluster("WebCluster", {
  vpc,
});

cluster.addService("Web", {
  link: [
    secrets.DbUrl,
    bucket,
    secrets.OptraApiId,
    secrets.OptraWorkspaceId,
    secrets.AWSAccessKeyId,
    secrets.AWSSecretAccessKey,
    secrets.StripeApiKey,
    secrets.StripeProProductId,
    secrets.StripeGenerationsProductId,
    secrets.StripeVerificationsProductId,
    secrets.ClerkSecretKey,
  ],
  public: {
    ports: [{ listen: "80/http", forward: "3000/http" }],
  },
  image: {
    dockerfile: "packages/web/Dockerfile",
  },
  dev: {
    directory: "packages/web",
    command: "pnpm run dev",
  },
  environment: {
    NODE_ENV: $dev ? "development" : "production",
    AWS_KMS_KEY_ARN: kmsKey.arn,
    JWKS_BASE_URL: jwksCloudfront.url,
    AWS_SCHEDULER_ROLE_ARN: schedulerRole.arn,
    AWS_SCHEDULER_FAILED_DLQ_ARN: schedulerDLQ.arn,
    AWS_MESSAGE_QUEUE_ARN: messageQueue.arn,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: secrets.ClerkPublishableKey.value,
    NEXT_PUBLIC_JWKS_BUCKET_URL: `https://${bucket.name}.s3.amazonaws.com`,
    NEXT_PUBLIC_APP_URL: $dev
      ? "http://localhost:3000"
      : "https://phractal.xyz",
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: "/sign-up",
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/sign-in",
  },
});
