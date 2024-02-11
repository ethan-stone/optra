import { App } from '@/app';
import { HTTPException, errorResponseSchemas } from '@/errors';
import { db, keyManagementService, tokenService } from '@/root';
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
								}),
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

		const verifiedAuthHeader = await tokenService.verifyAuthHeader(c.req.header('Authorization'));

		if (!verifiedAuthHeader.valid) {
			logger.info('Could not parse Authorization header');
			throw new HTTPException({
				message: 'Could not parse Authorization header',
				reason: 'BAD_JWT',
			});
		}

		const verifiedToken = await tokenService.verifyToken(verifiedAuthHeader.token, c);

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

		const existingApi = await db.getApiByWorkspaceAndName(workspace.id, name);

		if (existingApi) {
			logger.info(`Api with name ${name} already exists in workspace ${workspace.id}`);
			throw new HTTPException({
				reason: 'CONFLICT',
				message: 'An api with this name already exists in this workspace.',
			});
		}

		const now = new Date();

		switch (algorithm) {
			case 'hsa256': {
				// Generate a plaintext signing secret.
				const signingSecret = (await crypto.subtle.generateKey(
					{
						name: 'HMAC',
						hash: { name: 'SHA-256' },
					},
					true,
					['sign', 'verify'],
				)) as CryptoKey;

				const exportedSigningSecret = Buffer.from((await crypto.subtle.exportKey('raw', signingSecret)) as ArrayBuffer).toString('base64');

				// Encrypt the signing secret with the data encryption key for the workspace.
				const encryptResult = await keyManagementService.encryptWithDataKey(
					workspace.dataEncryptionKeyId,
					Buffer.from(exportedSigningSecret, 'base64'),
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

				logger.info(`Successfully created api with id ${id}`);

				return c.json({ id }, 200);
			}
			case 'rsa256': {
				const keyPair = (await crypto.subtle.generateKey(
					{
						name: 'RSASSA-PKCS1-v1_5',
						modulusLength: 2048,
						publicExponent: new Uint8Array([1, 0, 1]),
						hash: { name: 'SHA-256' },
					},
					true,
					['sign', 'verify'],
				)) as CryptoKeyPair;

				const publicKey = (await crypto.subtle.exportKey('jwk', keyPair.publicKey)) as JsonWebKey;
				const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

				const encryptResult = await keyManagementService.encryptWithDataKey(
					workspace.dataEncryptionKeyId,
					Buffer.from(privateKey as ArrayBuffer),
				);

				const { id, currentSigningSecretId } = await db.createApi({
					encryptedSigningSecret: Buffer.from(encryptResult.encryptedData).toString('base64'),
					iv: Buffer.from(encryptResult.iv).toString('base64'),
					algorithm,
					name: name,
					scopes: scopes,
					workspaceId: verifiedToken.client.forWorkspaceId,
					createdAt: now,
					updatedAt: now,
				});

				// upload the public key to R2
				await c.env.JWKS_BUCKET.put(
					`${workspace.id}/${id}/.well-known/jwks.json`,
					JSON.stringify({
						keys: [
							{
								...publicKey,
								kid: currentSigningSecretId,
							},
						],
					}),
					{
						httpMetadata: {
							contentType: 'application/json',
						},
					},
				);

				logger.info(`Successfully created api with id ${id}`);

				return c.json({ id }, 200);
			}
			default: {
				throw new HTTPException({
					message: 'Invalid algorithm',
					reason: 'BAD_REQUEST',
				});
			}
		}
	});
}
