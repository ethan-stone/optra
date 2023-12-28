import { App } from '@/app';
import { verifyAuthHeader, verifyToken } from '@/authorizers';
import { HTTPException, errorResponseSchemas } from '@/errors';
import { db } from '@/root';
import { createRoute, z } from '@hono/zod-openapi';

const route = createRoute({
	method: 'post',
	path: '/v1/apis.addScope',
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

export function makeV1AddApiScope(app: App) {
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

		const { apiId, scope } = c.req.valid('json');

		const api = await db.getApiById(apiId);

		if (!api) {
			throw new HTTPException({
				message: `Could not find api ${apiId}`,
				reason: 'NOT_FOUND',
			});
		}

		if (verifiedToken.client.forWorkspaceId !== api.workspaceId) {
			throw new HTTPException({
				message: `Could not find api ${apiId}`,
				reason: 'NOT_FOUND',
			});
		}

		const existingScope = api.scopes.find((s) => s.name === scope.name);

		if (existingScope) {
			throw new HTTPException({
				reason: 'CONFLICT',
				message: 'Scope with provided name already exists',
			});
		}

		const now = new Date();

		const { id } = await db.createApiScope({
			apiId: apiId,
			name: scope.name,
			description: scope.description,
			createdAt: now,
			updatedAt: now,
		});

		return c.json(
			{
				id,
			},
			200
		);
	});
}
