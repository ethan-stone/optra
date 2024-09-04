import { schema } from "../../core/src";
import { bootstrap } from "./index";
import { drizzle } from "drizzle-orm/postgres-js";
import { KMSClient } from "@aws-sdk/client-kms";
import { S3Client } from "@aws-sdk/client-s3";
import { getDrizzle } from "@optra/core/drizzle";
import { AWSKeyManagementService } from "@optra/core/key-management";

function format(obj: Record<string, any>): string {
  return Object.entries(obj)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

async function main() {
  const s3Client = new S3Client({
    credentials: {
      accessKeyId: process.env.CF_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CF_SECRET_ACCESS_KEY!,
    },
    endpoint: process.env.CF_R2_ENDPOINT!,
    region: "auto",
  });

  const data = await bootstrap(
    process.env.DRIZZLE_DATABASE_URL!,
    process.env.AWS_ACCESS_KEY_ID!,
    process.env.AWS_SECRET_ACCESS_KEY!,
    process.env.AWS_KMS_KEY_ARN!,
    process.env.BUCKET_NAME!
  );

  console.log(format(data));
}

main();
