import { z } from 'zod';

export const testEnvSchema = z.object({
	TEST_BASE_URL: z.string(),
	JWKS_BUCKET_URL: z.string(),
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
	BASIC_CLIENT_ID_WITH_LOW_RATELIMIT: z.string(),
	BASIC_CLIENT_SECRET_WITH_LOW_RATELIMIT: z.string(),
	BASIC_CLIENT_ID_FOR_ROTATING: z.string(),
	BASIC_CLIENT_SECRET_FOR_ROTATING: z.string(),
});
