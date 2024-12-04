import { App } from '@/app';
import { HTTPException, errorResponseSchemas } from '@/errors';
import { createRoute, z } from '@hono/zod-openapi';

const route = createRoute({
	operationId: 'addApiScope',
	method: 'post' as const,
	path: '/v1/apis.addScope',
	summary: 'Add a Scope to an API',
	description: 'Add a scope to an api by providing a name and description',
	request: {
		body: {
			required: true,
			content: {
				'application/json': {
					schema: z.object({
						apiId: z.string(),
						scope: z.object({
							name: z.string(),
							description: z.string(),
						}),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Response from adding a scope to an api',
			content: {
				'application/json': {
					schema: z.object({
						id: z.string(),
					}),
				},
			},
		},
		...errorResponseSchemas,
	},
});

export function v1AddApiScope(app: App) {
	app.openapi(route, async (c) => {
		const logger = c.get('logger');
		const { tokenService, db } = c.get('root');

		const verifiedAuthHeader = await tokenService.verifyAuthHeader(c.req.header('Authorization'));

		if (!verifiedAuthHeader.valid) {
			logger.info('Could not parse Authorization header');
			throw new HTTPException({
				message: 'Could not parse Authorization header',
				reason: 'BAD_JWT',
			});
		}

		const { apiId, scope } = c.req.valid('json');

		const api = await db.apis.getById(apiId);

		if (api === null) {
			logger.info(`Api with id ${apiId} does not exist`);
			throw new HTTPException({
				reason: 'NOT_FOUND',
				message: `Api ${apiId} not found`,
			});
		}

		const verifiedToken = await tokenService.verifyToken(verifiedAuthHeader.token, c, {
			mustBeRootClient: true,
			scopeQuery: {
				or: ['api:update_api:*', `api:update_api:${apiId}`],
			},
		});

		if (!verifiedToken.valid) {
			logger.info(`Token is not valid. Reason: ${verifiedToken.reason}`);
			throw new HTTPException({
				message: verifiedToken.message,
				reason: verifiedToken.reason,
			});
		}

		if (verifiedToken.client.forWorkspaceId !== api.workspaceId) {
			logger.info(`Could not find api ${apiId} or client ${verifiedToken.client.id} is not allowed to modify it.`);
			throw new HTTPException({
				message: `Could not find api ${apiId}`,
				reason: 'NOT_FOUND',
			});
		}

		const existingScope = api.scopes.find((s) => s.name === scope.name);

		if (existingScope) {
			logger.info(`Scope with name ${scope.name} already exists on api ${apiId}`);
			throw new HTTPException({
				reason: 'CONFLICT',
				message: 'Scope with provided name already exists',
			});
		}

		const now = new Date();

		const { id } = await db.apis.createScope({
			apiId: apiId,
			workspaceId: api.workspaceId,
			name: scope.name,
			description: scope.description,
			createdAt: now,
			updatedAt: now,
		});

		logger.info(`Created scope ${id} on api ${apiId}`);

		return c.json(
			{
				id,
			},
			200,
		);
	});
}
