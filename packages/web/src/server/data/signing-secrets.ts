import { getDrizzle } from "@optra/core/drizzle";
import { DrizzleSigningSecretRepo } from "@optra/core/signing-secrets";
import { env } from "@/env";

async function getSigningSecretRepo() {
  const { db } = await getDrizzle(env.DATABASE_URL);
  return new DrizzleSigningSecretRepo(db);
}

export async function getSigningSecretById(id: string) {
  const signingSecrets = await getSigningSecretRepo();

  return signingSecrets.getById(id);
}
