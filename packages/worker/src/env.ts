import { z } from 'zod';

export const envSchema = z.object({
	DRIZZLE_DATABASE_URL: z.string(),
	JWT_SECRET: z.string(),
	AXIOM_TOKEN: z.string().optional(),
	AXIOM_DATASET: z.string().optional(),
	AXIOM_ORG_ID: z.string().optional(),
	ENVIRONMENT: z.enum(['development', 'production']),
});

export type Env = z.infer<typeof envSchema>;
