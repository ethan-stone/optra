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
    secrets.SupabaseUrl,
    secrets.SupabaseAnonKey,
    secrets.SupabaseJwtSecret,
    secrets.SupabaseSecretKey,
    secrets.StripeApiKey,
    secrets.StripeProProductId,
    secrets.StripeGenerationsProductId,
    secrets.StripeVerificationsProductId,
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
    NEXT_PUBLIC_SUPABASE_URL: secrets.SupabaseUrl.value,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: secrets.SupabaseAnonKey.value,
    NEXT_PUBLIC_JWKS_BUCKET_URL: `https://${bucket.name}.s3.amazonaws.com`,
    NEXT_PUBLIC_APP_URL: $dev
      ? "http://localhost:3000"
      : "https://phractal.xyz",
  },
});
