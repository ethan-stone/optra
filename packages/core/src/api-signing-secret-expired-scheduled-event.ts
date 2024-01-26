import { z } from "zod";

export const ApiSigningSecretExpiredScheduledEvent = z.object({
  secretId: z.string(),
});
