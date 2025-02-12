import { App } from '@/app';
import { HTTPException, errorResponseSchemas } from '@/errors';
import { createRoute, z } from '@hono/zod-openapi';

const route = createRoute({
	operationId: 'getClient',
	method: 'get' as const,
	path: '/v1/clients.getClient',
	summary: 'Get a Client By ID',
	description: 'Get a client by its unique ID',
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
		const { db, tokenService } = c.get('root');

		const { clientId } = c.req.valid('query');

		const verifiedAuthHeader = await tokenService.verifyAuthHeader(c.req.header('Authorization'));

		if (!verifiedAuthHeader.valid) {
			logger.info('Could not parse Authorization header');
			throw new HTTPException({
				message: 'Could not parse Authorization header',
				reason: 'BAD_JWT',
			});
		}

		const client = await db.clients.getById(clientId);

		if (client === null) {
			logger.info(`Client with id ${clientId} does not exist`);
			throw new HTTPException({
				reason: 'NOT_FOUND',
				message: 'The client that you are trying to get does not exist',
			});
		}

		const verifiedToken = await tokenService.verifyToken(verifiedAuthHeader.token, c, {
			scopeQuery: {
				or: ['api:read_client:*', `api:read_client:${client.apiId}`],
			},
			mustBeRootClient: true,
		});

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

		if (client.workspaceId !== verifiedToken.client.forWorkspaceId) {
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
