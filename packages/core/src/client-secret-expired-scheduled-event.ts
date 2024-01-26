import { z } from "zod";

export const ClientSecretExpiredScheduledEvent = z.object({
  secretId: z.string(),
});
