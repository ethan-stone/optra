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
						algorithm: z.enum(['hsa256', 'rsa256']),
						scopes: z
							.array(
								z.object({
									name: z.string(),
									description: z.string(),
								})
							)
							.optional()
							.refine((scopes) => {
								if (!scopes) return true;
								const names = scopes.map((s) => s.name);
								// Check for duplicates
								return new Set(names).size === names.length;
							})
							.openapi({
								description: 'An array of scopes to create with the api. Scopes must have unique names within the api.',
							}),
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

export function v1CreateApi(app: App) {
	app.openapi(route, async (c) => {
		const logger = c.get('logger');

		const { name, scopes, algorithm } = c.req.valid('json');

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

		const workspace = await db.getWorkspaceById(verifiedToken.client.forWorkspaceId);

		if (!workspace) {
			logger.error(`Somehow could not find workspace for verfied token.`);
			throw new HTTPException({
				reason: 'INTERNAL_SERVER_ERROR',
				message: 'An internal error occurred.',
			});
		}

		const now = new Date();

		// Generate a plaintext signing secret.
		const signingSecret = await crypto.subtle.generateKey(
			{
				name: 'HMAC',
				hash: { name: 'SHA-256' },
			},
			true,
			['sign', 'verify']
		);

		const exportedSigningSecret = Buffer.from(await crypto.subtle.exportKey('raw', signingSecret)).toString('base64');

		// Encrypt the signing secret with the data encryption key for the workspace.
		const encryptResult = await keyManagementService.encryptWithDataKey(
			workspace.dataEncryptionKeyId,
			Buffer.from(exportedSigningSecret, 'base64')
		);

		const { id } = await db.createApi({
			encryptedSigningSecret: Buffer.from(encryptResult.encryptedData).toString('base64'),
			iv: Buffer.from(encryptResult.iv).toString('base64'),
			algorithm,
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
