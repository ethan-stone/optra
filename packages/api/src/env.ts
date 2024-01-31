import { z } from 'zod';

export const envSchema = z.object({
	DRIZZLE_DATABASE_URL: z.string(),
	ENVIRONMENT: z.enum(['development', 'production']),
	JWT_SECRET: z.string(),
	BASELIME_API_KEY: z.string().optional(),
	AWS_ACCESS_KEY_ID: z.string(),
	AWS_SECRET_ACCESS_KEY: z.string(),
	AWS_KMS_KEY_ARN: z.string(),
	AWS_MESSAGE_QUEUE_ARN: z.string(),
	AWS_SCHEDULER_ROLE_ARN: z.string(),
	AWS_SCHEDULER_FAILED_DQL: z.string(),
	JWKS_BUCKET: z.custom<R2Bucket>((bucket) => typeof bucket === 'object'),
	TINY_BIRD_API_KEY: z.string().optional(),
	TINY_BIRD_MONTHLY_VERIFICATIONS_ENDPOINT: z.string().optional(),
	TINY_BIRD_MONTHLY_GENERATIONS_ENDPOINT: z.string().optional(),
	JWKS_BUCKET_URL: z.string(),
});

export type Env = z.infer<typeof envSchema>;
