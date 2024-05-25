import { App } from '@/app';
import { HTTPException, errorResponseSchemas } from '@/errors';
import { db, tokenService } from '@/root';
import { createRoute, z } from '@hono/zod-openapi';

const route = createRoute({
	method: 'get' as const,
	path: '/v1/clients.getClient',
	request: {
		query: z.object({
			clientId: z.string(),
		}),
	},
	responses: {
		200: {
			description: 'The client with the given id',
			content: {
				'application/json': {
					schema: z.object({
						name: z.string(),
						id: z.string(),
						createdAt: z.string().datetime(),
						updatedAt: z.string().datetime(),
						version: z.number(),
						workspaceId: z.string(),
						forWorkspaceId: z.string().nullable(),
						apiId: z.string(),
						rateLimitBucketSize: z.number().nullable(),
						rateLimitRefillAmount: z.number().nullable(),
						rateLimitRefillInterval: z.number().nullable(),
					}),
				},
			},
		},
		...errorResponseSchemas,
	},
});

export function v1GetClient(app: App) {
	app.openapi(route, async (c) => {
		const logger = c.get('logger');

		const { clientId } = c.req.valid('query');

		const verifiedAuthHeader = await tokenService.verifyAuthHeader(c.req.header('Authorization'));

		if (!verifiedAuthHeader.valid) {
			logger.info('Could not parse Authorization header');
			throw new HTTPException({
				message: 'Could not parse Authorization header',
				reason: 'BAD_JWT',
			});
		}

		const verifiedToken = await tokenService.verifyToken(verifiedAuthHeader.token, c);

		if (!verifiedToken.valid) {
			logger.info(`Token is not valid. Reason ${verifiedToken.reason}`);
			throw new HTTPException({
				message: verifiedToken.message,
				reason: verifiedToken.reason,
			});
		}

		if (!verifiedToken.client.forWorkspaceId) {
			logger.info(`Client ${verifiedToken.client.id} is not a root client. Can not get clients.`);
			throw new HTTPException({
				reason: 'FORBIDDEN',
				message: 'This route can only be used by root clients',
			});
		}

		const client = await db.getClientById(clientId);

		if (client === null || client.workspaceId !== verifiedToken.client.forWorkspaceId) {
			logger.info(`Client with id ${clientId} does not exist or does not belong to the root clients workspace.`);
			throw new HTTPException({
				reason: 'NOT_FOUND',
				message: 'The client that you are trying to get does not exist',
			});
		}

		logger.info(`Got client ${clientId}`);

		return c.json(
			{
				...client,
				createdAt: client.createdAt.toISOString(),
				updatedAt: client.updatedAt.toISOString(),
			},
			200,
		);
	});
}
