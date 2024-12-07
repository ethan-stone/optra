import { App } from '@/app';
import { HTTPException, errorResponseSchemas } from '@/errors';
import { createRoute, z } from '@hono/zod-openapi';

const route = createRoute({
	operationId: 'deleteApi',
	method: 'post' as const,
	path: '/v1/apis.deleteApi',
	summary: 'Delete an API',
	description: 'Delete an api by its unique ID',
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
						id: z.string(),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Response from removing a scope from an api',
			content: {
				'application/json': {
					schema: z.null(),
				},
			},
		},
		...errorResponseSchemas,
	},
});

export function v1DeleteApi(app: App) {
	app.openapi(route, async (c) => {
		const logger = c.get('logger');
		const { tokenService, db } = c.get('root');

		const { id } = c.req.valid('json');

		const verifiedAuthHeader = await tokenService.verifyAuthHeader(c.req.header('Authorization'));

		if (!verifiedAuthHeader.valid) {
			logger.info('Could not parse Authorization header');
			throw new HTTPException({
				message: 'Could not parse Authorization header',
				reason: 'BAD_JWT',
			});
		}

		const api = await db.apis.getById(id);

		if (api === null) {
			logger.info(`Api with id ${id} does not exist`);
			throw new HTTPException({
				message: `Api with id ${id} does not exist.`,
				reason: 'NOT_FOUND',
			});
		}

		const verifiedToken = await tokenService.verifyToken(verifiedAuthHeader.token, c, {
			mustBeRootClient: true,
			scopeQuery: {
				or: ['api:delete_api:*', `api:delete_api:${id}`],
			},
		});

		if (!verifiedToken.valid) {
			logger.info(`Token is invalid. Reason: ${verifiedToken.reason}`);
			throw new HTTPException({
				reason: verifiedToken.reason,
				message: verifiedToken.message,
			});
		}

		if (api.workspaceId !== verifiedToken.client.forWorkspaceId) {
			logger.info(`Api with id ${id} does not exist or client ${verifiedToken.client.id} is not allowed to delete it.`);
			throw new HTTPException({
				message: `Api with id ${id} does not exist.`,
				reason: 'NOT_FOUND',
			});
		}

		await db.apis.delete(id);

		return c.json(null, 200);
	});
}
