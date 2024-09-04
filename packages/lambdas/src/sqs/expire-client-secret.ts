import { ClientSecretRepo } from "@optra/core/client-secrets";

export type ExpireClientSecretArgs = {
  clientId: string;
  clientSecretId: string;
};

export async function expireClientSecret(
  args: ExpireClientSecretArgs,
  ctx: {
    clientSecretRepo: ClientSecretRepo;
  }
): Promise<void> {
  const { clientId, clientSecretId } = args;

  await ctx.clientSecretRepo.expire(clientId, clientSecretId);

  console.log(`Expired client secret ${clientSecretId} for client ${clientId}`);
}
