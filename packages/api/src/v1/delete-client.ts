import { App } from '@/app';
import { HTTPException } from '@/errors';
import { createRoute, z } from '@hono/zod-openapi';

const route = createRoute({
	operationId: 'deleteClient',
	method: 'post' as const,
	path: '/v1/clients.deleteClient',
	summary: 'Delete a Client',
	description: 'Delete a client by its unique ID',
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
			description: 'Response from deleting a client',
			content: {
				'application/json': {
					schema: z.null(),
				},
			},
		},
	},
});

export function v1DeleteClient(app: App) {
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

		const client = await db.clients.getById(id);

		if (client === null) {
			logger.info(`Client with id ${id} does not exist`);
			throw new HTTPException({
				message: `Client with id ${id} does not exist.`,
				reason: 'NOT_FOUND',
			});
		}

		const verifiedToken = await tokenService.verifyToken(verifiedAuthHeader.token, c, {
			scopeQuery: {
				or: ['api:delete_client:*', `api:delete_client:${id}`],
			},
		});

		if (!verifiedToken.valid) {
			logger.info(`Token is invalid. Reason: ${verifiedToken.reason}`);
			throw new HTTPException({
				reason: verifiedToken.reason,
				message: verifiedToken.message,
			});
		}

		if (client.workspaceId !== verifiedToken.client.forWorkspaceId) {
			logger.info(`Client with id ${id} does not exist or client ${verifiedToken.client.id} does not have permission to modify it.`);
			throw new HTTPException({
				reason: 'NOT_FOUND',
				message: 'Client not found',
			});
		}

		await db.clients.delete(id);

		return c.json(null, 200);
	});
}
