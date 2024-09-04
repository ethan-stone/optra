import { DrizzleSigningSecretRepo } from "@optra/core/signing-secrets";

export type ExpireApiSigningSecretArgs = {
  apiId: string;
  signingSecretId: string;
};

export async function expireApiSigningSecret(
  args: ExpireApiSigningSecretArgs,
  ctx: {
    signingSecretRepo: DrizzleSigningSecretRepo;
  }
): Promise<void> {
  const { apiId, signingSecretId } = args;

  await ctx.signingSecretRepo.expire(apiId, signingSecretId);

  console.log(`Revoked api signing secret ${signingSecretId}`);
}
