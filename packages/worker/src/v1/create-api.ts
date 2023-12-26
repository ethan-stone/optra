import { App } from '@/app';
import { verifyAuthHeader, verifyToken } from '@/authorizers';
import { HTTPException, errorResponseSchemas } from '@/errors';
import { db, keyManagementService } from '@/root';
import { createRoute, z } from '@hono/zod-openapi';
import { Buffer } from '@/buffer';

const route = createRoute({
	method: 'post',
	path: '/v1/apis.createApi',
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
						name: z.string(),
						scopes: z
							.array(
								z.object({
									name: z.string(),
									description: z.string(),
								})
							)
							.optional(),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Response from creating an api',
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

export function makeV1CreateApi(app: App) {
	app.openapi(route, async (c) => {
		const logger = c.get('logger');

		const { name, scopes } = c.req.valid('json');

		const verifiedAuthHeader = await verifyAuthHeader(c.req.header('Authorization'));

		if (!verifiedAuthHeader.valid) {
			logger.info('Could not parse Authorization header');
			throw new HTTPException({
				message: 'Could not parse Authorization header',
				reason: 'BAD_JWT',
			});
		}

		const verifiedToken = await verifyToken(verifiedAuthHeader.token, c.env.JWT_SECRET, { logger });

		if (!verifiedToken.valid) {
			logger.info(`Token is invalid. Reason: ${verifiedToken.reason}`);
			throw new HTTPException({
				reason: verifiedToken.reason,
				message: verifiedToken.message,
			});
		}

		if (!verifiedToken.client.forWorkspaceId) {
			logger.info(`Client with id ${verifiedToken.client.id} is not a root client. Can not create apis.`);
			throw new HTTPException({
				reason: 'FORBIDDEN',
				message: 'This route can only be used by root clients.',
			});
		}

		const { ciphertext } = await keyManagementService.generateDataKey();

		const now = new Date();

		const { id } = await db.createApi({
			encryptedSigningSecret: Buffer.from(ciphertext).toString('base64'),
			name: name,
			scopes: scopes,
			workspaceId: verifiedToken.client.forWorkspaceId,
			createdAt: now,
			updatedAt: now,
		});

		logger.info(`Successufly created api with id ${id}`);

		return c.json({ id });
	});
}
