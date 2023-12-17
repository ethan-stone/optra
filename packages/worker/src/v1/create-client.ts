import { App } from '@/app';
import { verifyAuthHeader, verifyToken } from '@/authorizers';
import { HTTPException, errorResponseSchemas } from '@/errors';
import { db } from '@/root';
import { createRoute, z } from '@hono/zod-openapi';

const route = createRoute({
	method: 'post',
	path: '/v1/clients.cretaeClient',
	security: [
		{
			oauth2: [],
		},
	],
	request: {
		body: {
			required: true,
			content: {
				'application/json': {
					schema: z.object({
						name: z.string(),
						apiId: z.string(),
						rateLimitBucketSize: z.number().int(),
						rateLimitRefillAmount: z.number().int(),
						rateLimitRefillInterval: z.number().int(),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Response from creating a client',
			content: {
				'application/json': {
					schema: z.object({
						clientId: z.string(),
						clientSecret: z.string(),
					}),
				},
			},
		},
		...errorResponseSchemas,
	},
});

export function makeV1CreateClient(app: App) {
	app.openapi(route, async (c) => {
		const { apiId, name, rateLimitBucketSize, rateLimitRefillAmount, rateLimitRefillInterval } = c.req.valid('json');

		const verifiedAuthHeader = await verifyAuthHeader(c.req.header('Authorization'));

		if (!verifiedAuthHeader.valid) {
			throw new HTTPException({
				message: 'Could not parse Authorization header',
				reason: 'BAD_JWT',
			});
		}

		const verifiedToken = await verifyToken(verifiedAuthHeader.token, c.env.JWT_SECRET);

		if (!verifiedToken.valid) {
			throw new HTTPException({
				message: verifiedToken.message,
				reason: verifiedToken.reason,
			});
		}

		if (!verifiedToken.client.forWorkspaceId) {
			throw new HTTPException({
				reason: 'FORBIDDEN',
				message: 'This route can only be used by root clientss',
			});
		}

		const api = await db.getApiById(apiId);

		if (!api || api.workspaceId !== verifiedToken.client.forWorkspaceId) {
			throw new HTTPException({
				reason: 'BAD_REQUEST',
				message: 'The api that you are trying to create a client for does not exist or does not belong to your workspace',
			});
		}

		const now = new Date();

		const { id, secret } = await db.createBasicClient({
			apiId,
			name,
			version: 1,
			workspaceId: verifiedToken.client.forWorkspaceId,
			rateLimitBucketSize,
			rateLimitRefillAmount,
			rateLimitRefillInterval,
			createdAt: now,
			updatedAt: now,
		});

		return c.json(
			{
				clientId: id,
				clientSecret: secret,
			},
			200
		);
	});
}