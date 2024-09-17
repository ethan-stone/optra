import { z } from 'zod';

export const envSchema = z.object({
	ENVIRONMENT: z.enum(['development', 'production']),
	BASELIME_API_KEY: z.string().optional(),
	AWS_KMS_KEY_ARN: z.string(),
	AWS_MESSAGE_QUEUE_ARN: z.string(),
	AWS_MESSAGE_QUEUE_URL: z.string(),
	AWS_SCHEDULER_ROLE_ARN: z.string(),
	AWS_SCHEDULER_FAILED_DLQ: z.string(),
	AWS_S3_PUBLIC_URL: z.string(),
});

export type Env = z.infer<typeof envSchema>;
