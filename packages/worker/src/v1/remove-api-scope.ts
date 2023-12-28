import { App } from '@/app';
import { verifyAuthHeader, verifyToken } from '@/authorizers';
import { HTTPException, errorResponseSchemas } from '@/errors';
import { db } from '@/root';
import { createRoute, z } from '@hono/zod-openapi';

const route = createRoute({
	method: 'post',
	path: '/v1/apis.removeScope',
	request: {
		body: {
			required: true,
			content: {
				'application/json': {
					schema: z.object({
						apiId: z.string(),
						scopeId: z.string().openapi({
							description: 'The id or name of the scope to remove.',
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

export function makeV1RemoveApiScope(app: App) {
	app.openapi(route, async (c) => {
		const logger = c.get('logger');

		const verifiedAuthHeader = await verifyAuthHeader(c.req.header('Authorization'));

		if (!verifiedAuthHeader.valid) {
			logger.info('Could not parse Authorization header');
			throw new HTTPException({
				message: 'Could not parse Authorization header',
				reason: 'BAD_JWT',
			});
		}

		const verifiedToken = await verifyToken(verifiedAuthHeader.token, { logger });

		if (!verifiedToken.valid) {
			logger.info(`Token is not valid. Reason: ${verifiedToken.reason}`);
			throw new HTTPException({
				message: verifiedToken.message,
				reason: verifiedToken.reason,
			});
		}

		const { apiId, scopeId } = c.req.valid('json');

		const api = await db.getApiById(apiId);

		if (!api) {
			logger.info(`Could not find api ${apiId}`);
			throw new HTTPException({
				message: `Could not find api ${apiId}`,
				reason: 'NOT_FOUND',
			});
		}

		if (verifiedToken.client.forWorkspaceId !== api.workspaceId) {
			logger.info(`Client ${verifiedToken.client.id} is not allowed to modify api ${apiId}`);
			throw new HTTPException({
				message: `Could not find api ${apiId}`,
				reason: 'NOT_FOUND',
			});
		}

		// find scope with matching name or id
		const existingScope = api.scopes.find((s) => s.id === scopeId || s.name === scopeId);

		// if it doesn't exist then return early with a successful response
		if (!existingScope) {
			logger.info(`Could not find scope ${scopeId} on api ${apiId}. This isn't an error.`);
			return c.json(null, 200);
		}

		await db.deleteApiScopeById(existingScope.id);

		logger.info(`Removed scope ${existingScope.id} from api ${apiId}`);

		return c.json(null, 200);
	});
}
