import { z } from 'zod';

export const envSchema = z.object({
	DRIZZLE_DATABASE_URL: z.string(),
	JWT_SECRET: z.string(),
});

export type Env = z.infer<typeof envSchema>;
