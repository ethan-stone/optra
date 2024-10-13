import { bucket } from "./bucket";
import { kmsKey } from "./kms";
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
  },
});
