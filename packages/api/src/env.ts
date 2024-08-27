import { z } from 'zod';

export const envSchema = z.object({
	ENVIRONMENT: z.enum(['development', 'production']),
	BASELIME_API_KEY: z.string().optional(),
	AWS_KMS_KEY_ARN: z.string(),
	AWS_MESSAGE_QUEUE_ARN: z.string(),
	AWS_SCHEDULER_ROLE_ARN: z.string(),
	AWS_SCHEDULER_FAILED_DLQ: z.string(),
	AWS_S3_PUBLIC_URL: z.string(),
	TINY_BIRD_API_KEY: z.string().optional(),
	TINY_BIRD_BASE_URL: z.string().optional(),
	TINY_BIRD_MONTHLY_VERIFICATIONS_ENDPOINT: z.string().optional(),
	TINY_BIRD_MONTHLY_GENERATIONS_ENDPOINT: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;
