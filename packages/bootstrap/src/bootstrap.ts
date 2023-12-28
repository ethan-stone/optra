import { schema } from "@optra/db";
import { bootstrap } from "./index";
import { connect } from "@planetscale/database";
import { drizzle } from "drizzle-orm/planetscale-serverless";
import { KMSClient } from "@aws-sdk/client-kms";

function format(obj: Record<string, any>): string {
  return Object.entries(obj)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

async function main() {
  const connection = connect({
    url: process.env.DRIZZLE_DATABASE_URL!,
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

  const data = await bootstrap(db, kmsClient, process.env.AWS_KMS_KEY_ARN!);

  console.log(format(data));
}

main();
