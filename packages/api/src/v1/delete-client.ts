import { App } from '@/app';
import { verifyAuthHeader, verifyToken } from '@/authorizers';
import { HTTPException } from '@/errors';
import { db } from '@/root';
import { createRoute, z } from '@hono/zod-openapi';

const route = createRoute({
	method: 'post',
	path: '/v1/clients.deleteClient',
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

		const client = await db.getClientById(id);

		if (!client || client.workspaceId !== verifiedToken.client.forWorkspaceId) {
			logger.info(`Client with id ${id} does not exist or client ${verifiedToken.client.id} does not have permission to modify it.`);
			throw new HTTPException({
				reason: 'NOT_FOUND',
				message: 'Client not found',
			});
		}

		await db.deleteClientById(id);

		return c.json(null, 200);
	});
}
