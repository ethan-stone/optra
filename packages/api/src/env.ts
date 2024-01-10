import { z } from 'zod';

export const envSchema = z.object({
	DRIZZLE_DATABASE_URL: z.string(),
	ENVIRONMENT: z.enum(['development', 'production']),
	JWT_SECRET: z.string(),
	BASELIME_API_KEY: z.string().optional(),
	AXIOM_TOKEN: z.string().optional(),
	AXIOM_DATASET: z.string().optional(),
	AXIOM_ORG_ID: z.string().optional(),
	AWS_ACCESS_KEY_ID: z.string(),
	AWS_SECRET_ACCESS_KEY: z.string(),
	AWS_KMS_KEY_ARN: z.string(),
	AWS_SECRET_EXPIRED_TARGET_ARN: z.string(),
	AWS_SCHEDULER_ROLE_ARN: z.string(),
	AWS_SCHEDULE_FAILED_DQL: z.string(),
	JWKS_BUCKET: z.custom<R2Bucket>((bucket) => typeof bucket === 'object'),
});

export type Env = z.infer<typeof envSchema>;
