import { schema } from "@optra/db";
import { bootstrap } from "./index";
import { drizzle } from "drizzle-orm/libsql";
import { KMSClient } from "@aws-sdk/client-kms";
import { S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@libsql/client";

function format(obj: Record<string, any>): string {
  return Object.entries(obj)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

async function main() {
  const connection = createClient({
    url: process.env.DRIZZLE_DATABASE_URL!,
    authToken: process.env.DRIZZLE_DATABASE_TOKEN!,
  });

  const db = drizzle(connection, {
    schema: schema,
  });

  const kmsClient = new KMSClient({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    region: "us-east-1",
  });

  const s3Client = new S3Client({
    credentials: {
      accessKeyId: process.env.CF_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CF_SECRET_ACCESS_KEY!,
    },
    endpoint: process.env.CF_R2_ENDPOINT!,
    region: "auto",
  });

  const data = await bootstrap(
    db,
    kmsClient,
    s3Client,
    process.env.AWS_KMS_KEY_ARN!
  );

  console.log(format(data));
}

main();
