import { bucket } from "./bucket";
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
    secrets.ClerkSecretKey,
    secrets.ClerkPublishableKey,
    bucket,
    secrets.OptraApiId,
    secrets.OptraWorkspaceId,
    secrets.AWSAccessKeyId,
    secrets.AWSSecretAccessKey,
    secrets.SupabaseUrl,
    secrets.SupabaseAnonKey,
    secrets.SupabaseJwtSecret,
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
    AWS_SCHEDULER_ROLE_ARN: schedulerRole.arn,
    AWS_SCHEDULER_FAILED_DLQ_ARN: schedulerDLQ.arn,
    AWS_MESSAGE_QUEUE_ARN: messageQueue.arn,
    NEXT_PUBLIC_SUPABASE_URL: secrets.SupabaseUrl.value,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: secrets.SupabaseAnonKey.value,
  },
});
