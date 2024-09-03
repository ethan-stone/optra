import { S3Client } from "@aws-sdk/client-s3";
import { S3StorageBucket } from "./client";
import { env } from "@/env";

const s3Client = new S3Client({
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  region: "us-east-1",
});

export const storageBucket = new S3StorageBucket(
  s3Client,
  env.CF_JWKS_BUCKET_NAME,
);
