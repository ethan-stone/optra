import { z } from "zod";

export const SecretExpiredScheduledEvent = z.object({
  secretId: z.string(),
});
