import { AWSKeyManagementService } from "@optra/core/key-management";
import { env } from "@/env";
import { getDrizzle } from "@optra/core/drizzle";

export async function getKeyManagementService(): Promise<AWSKeyManagementService> {
  const { db } = await getDrizzle(env.DATABASE_URL);

  const keyManagementService = new AWSKeyManagementService(
    db,
    env.AWS_KMS_KEY_ARN,
    "us-east-1",
    env.AWS_ACCESS_KEY_ID,
    env.AWS_SECRET_ACCESS_KEY,
  );

  return keyManagementService;
}
