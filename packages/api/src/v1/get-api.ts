import { App } from '@/app';
import { HTTPException } from '@/errors';
import { createRoute, z } from '@hono/zod-openapi';

const route = createRoute({
	operationId: 'getApi',
	method: 'get' as const,
	path: '/v1/apis.getApi',
	summary: 'Get API By ID',
	description: 'Get an API by its unique ID',
	request: {
		query: z.object({
			apiId: z.string(),
		}),
	},
	responses: {
		200: {
			description: 'The api with the given id',
			content: {
				'application/json': {
					schema: z.object({
						id: z.string(),
						name: z.string(),
						workspaceId: z.string(),
						createdAt: z.string().datetime(),
						updatedAt: z.string().datetime(),
					}),
				},
			},
		},
	},
});

export function v1GetApi(app: App) {
	app.openapi(route, async (c) => {
		const logger = c.get('logger');
		const { tokenService, db } = c.get('root');

		const { apiId } = c.req.valid('query');

		const verifiedAuthHeader = await tokenService.verifyAuthHeader(c.req.header('Authorization'));

		if (!verifiedAuthHeader.valid) {
			logger.info('Could not parse Authorization header');
			throw new HTTPException({
				message: 'Could not parse Authorization header',
				reason: 'BAD_JWT',
			});
		}

		const api = await db.apis.getById(apiId);

		if (api === null) {
			logger.info(`Api with id ${apiId} does not exist`);
			throw new HTTPException({
				reason: 'NOT_FOUND',
				message: `Api ${apiId} not found`,
			});
		}

		const verifiedToken = await tokenService.verifyToken(verifiedAuthHeader.token, c, {
			scopeQuery: {
				or: ['api:read_api:*', `api:read_api:${apiId}`],
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

		if (api.workspaceId !== verifiedToken.client.forWorkspaceId) {
			logger.info(`Api with id ${apiId} does not exist or does not belong to the root clients workspace.`);
			throw new HTTPException({
				reason: 'NOT_FOUND',
				message: `Api ${apiId} not found`,
			});
		}

		logger.info(`Api ${apiId} found`);

		return c.json(
			{
				...api,
				createdAt: api.createdAt.toISOString(),
				updatedAt: api.updatedAt.toISOString(),
			},
			200,
		);
	});
}
