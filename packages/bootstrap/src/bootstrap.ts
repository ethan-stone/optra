import { bootstrap } from "./index";

function format(obj: Record<string, any>): string {
  return Object.entries(obj)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

async function main() {
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
