import { S3Client } from "@aws-sdk/client-s3";
import { R2StorageBucket } from "./client";
import { env } from "@/env";

const s3Client = new S3Client({
  credentials: {
    accessKeyId: env.CF_ACCESS_KEY_ID,
    secretAccessKey: env.CF_SECRET_ACCESS_KEY,
  },
  endpoint: env.CF_R2_ENDPOINT,
  region: "auto",
});

export const storageBucket = new R2StorageBucket(
  s3Client,
  env.CF_JWKS_BUCKET_NAME,
);
