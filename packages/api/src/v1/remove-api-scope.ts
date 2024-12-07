import { App } from '@/app';
import { HTTPException, errorResponseSchemas } from '@/errors';
import { createRoute, z } from '@hono/zod-openapi';

const route = createRoute({
	operationId: 'removeApiScope',
	method: 'post' as const,
	path: '/v1/apis.removeScope',
	summary: 'Remove a Scope from an API',
	description: 'Remove a scope from an api by providing the scope name. This will also remove it from all the clients.',
	request: {
		body: {
			required: true,
			content: {
				'application/json': {
					schema: z.object({
						apiId: z.string(),
						scopeName: z.string().openapi({
							description: 'The name of the scope to remove.',
						}),
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

export function v1RemoveApiScope(app: App) {
	app.openapi(route, async (c) => {
		const logger = c.get('logger');
		const { db, tokenService } = c.get('root');

		const verifiedAuthHeader = await tokenService.verifyAuthHeader(c.req.header('Authorization'));

		if (!verifiedAuthHeader.valid) {
			logger.info('Could not parse Authorization header');
			throw new HTTPException({
				message: 'Could not parse Authorization header',
				reason: 'BAD_JWT',
			});
		}

		const { apiId, scopeName } = c.req.valid('json');

		const api = await db.apis.getById(apiId);

		if (api === null) {
			logger.info(`Api with id ${apiId} does not exist`);
			throw new HTTPException({
				message: `Api with id ${apiId} does not exist.`,
				reason: 'NOT_FOUND',
			});
		}

		const verifiedToken = await tokenService.verifyToken(verifiedAuthHeader.token, c, {
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

		// find scope with matching name or id
		const existingScope = api.scopes.find((s) => s.name === scopeName);

		// if it doesn't exist then return early with a successful response
		if (!existingScope) {
			logger.info(`Could not find scope ${scopeName} on api ${apiId}. This isn't an error.`);
			return c.json(null, 200);
		}

		await db.apis.deleteScopeById(existingScope.id);

		logger.info(`Removed scope ${existingScope.id} from api ${apiId}`);

		return c.json(null, 200);
	});
}
