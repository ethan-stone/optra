import { App } from '@/app';
import { verifyAuthHeader, verifyToken } from '@/authorizers';
import { HTTPException, errorResponseSchemas } from '@/errors';
import { db } from '@/root';
import { createRoute, z } from '@hono/zod-openapi';

const route = createRoute({
	method: 'post',
	path: '/v1/apis.deleteApi',
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

		const { id } = c.req.valid('json');

		const verifiedAuthHeader = await verifyAuthHeader(c.req.header('Authorization'));

		if (!verifiedAuthHeader.valid) {
			logger.info('Could not parse Authorization header');
			throw new HTTPException({
				message: 'Could not parse Authorization header',
				reason: 'BAD_JWT',
			});
		}

		const verifiedToken = await verifyToken(verifiedAuthHeader.token, c);

		if (!verifiedToken.valid) {
			logger.info(`Token is invalid. Reason: ${verifiedToken.reason}`);
			throw new HTTPException({
				reason: verifiedToken.reason,
				message: verifiedToken.message,
			});
		}

		const api = await db.getApiById(id);

		if (!api || api.workspaceId !== verifiedToken.client.forWorkspaceId) {
			logger.info(`Api with id ${id} does not exist or client ${verifiedToken.client.id} is not allowed to delete it.`);
			throw new HTTPException({
				message: `Api with id ${id} does not exist.`,
				reason: 'NOT_FOUND',
			});
		}

		await db.deleteApiById(id);

		return c.json(null, 200);
	});
}
