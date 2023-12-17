import { z } from 'zod';

export const testEnv = z.object({
	BASE_URL: z.string(),
	DRIZZLE_DATABASE_URL: z.string(),
	JWT_SECRET: z.string(),
	OPTRA_WORKSPACE_ID: z.string(),
	OPTRA_API_ID: z.string(),
	WORKSPACE_ID: z.string(),
	ROOT_CLIENT_ID: z.string(),
	ROOT_CLIENT_SECRET: z.string(),
	OTHER_WORKSPACE_ID: z.string(),
	OTHER_ROOT_CLIENT_ID: z.string(),
	OTHER_ROOT_CLIENT_SECRET: z.string(),
	API_ID: z.string(),
	BASIC_CLIENT_ID: z.string(),
	BASIC_CLIENT_SECRET: z.string(),
});
