import { env } from "@/env";
import { SESEmailService } from "@optra/core/email";

export async function getEmailService() {
  const emailService = new SESEmailService(
    "us-east-1",
    env.AWS_ACCESS_KEY_ID,
    env.AWS_SECRET_ACCESS_KEY,
  );

  return emailService;
}
