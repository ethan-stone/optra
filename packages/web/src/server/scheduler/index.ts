import { env } from "@/env";
import { AWSEventScheduler } from "@optra/core/scheduler";

export async function getScheduler(): Promise<AWSEventScheduler> {
  const scheduler = new AWSEventScheduler(
    {
      eventTypeToTargetMap: {
        "client.secret.expired": { arn: env.AWS_MESSAGE_QUEUE_ARN },
        "api.signing_secret.expired": { arn: env.AWS_MESSAGE_QUEUE_ARN },
      },
      roleArn: env.AWS_SCHEDULER_ROLE_ARN,
      dlqArn: env.AWS_SCHEDULER_FAILED_DLQ_ARN,
    },
    "us-east-1",
    env.AWS_ACCESS_KEY_ID,
    env.AWS_SECRET_ACCESS_KEY,
  );

  return scheduler;
}
