import { z } from 'zod';

export const testEnv = z.object({
	DRIZZLE_DATABASE_URL: z.string(),
	JWT_SECRET: z.string(),
	OPTRA_WORKSPACE_ID: z.string(),
	OPTRA_API_ID: z.string(),
	WORKSPACE_ID: z.string(),
	ROOT_CLIENT_ID: z.string(),
	ROOT_CLIENT_SECRET: z.string(),
});
