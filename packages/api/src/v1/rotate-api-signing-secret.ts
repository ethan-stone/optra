import { App } from '@/app';
import { HTTPException } from '@/errors';
import { db, keyManagementService, scheduler, tokenService } from '@/root';
import { createRoute, z } from '@hono/zod-openapi';
import { Buffer } from '@/buffer';

const route = createRoute({
	method: 'post',
	path: '/v1/apis.rotateSigningSecret',
	request: {
		body: {
			required: true,
			content: {
				'application/json': {
					schema: z.object({
						apiId: z.string(),
						expiresIn: z.number().int().positive().nullable().openapi({
							description: 'How long until the secret should expire in milliseconds. If not provided, the secret will expire immediately.',
						}),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Response from rotating a signing secret',
			content: {
				'application/json': {
					schema: z.object({ id: z.string() }),
				},
			},
		},
	},
});

export function v1RotateApiSigningSecret(app: App) {
	app.openapi(route, async (c) => {
		const logger = c.get('logger');

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
			logger.info(`Token is not valid. Reason: ${verifiedToken.reason}`);
			throw new HTTPException({
				message: verifiedToken.message,
				reason: verifiedToken.reason,
			});
		}

		if (!verifiedToken.client.forWorkspaceId) {
			throw new HTTPException({
				message: 'Only root clients can rotate signing secrets.',
				reason: 'FORBIDDEN',
			});
		}

		const { apiId, expiresIn: providedExpiresIn } = c.req.valid('json');

		const api = await db.getApiById(apiId);

		if (!api || verifiedToken.client.forWorkspaceId !== api.workspaceId) {
			logger.info(`Api ${apiId} does not exist or client ${verifiedToken.client.id} is not allowed to modify it.`);
			throw new HTTPException({
				message: `Api ${apiId} does not exist`,
				reason: 'NOT_FOUND',
			});
		}

		const expiresIn = providedExpiresIn ?? 1000 * 60;

		const expiresAt = new Date(Date.now() + expiresIn);

		const currentSigningSecret = await db.getSigningSecretById(api.currentSigningSecretId);

		if (!currentSigningSecret) {
			logger.error(`Somehow api ${apiId} current signing does not exist. This should never happen.`);
			throw new HTTPException({
				message: `An internal error occurred.`,
				reason: 'INTERNAL_SERVER_ERROR',
			});
		}

		const workspace = await db.getWorkspaceById(api.workspaceId);

		if (!workspace) {
			logger.error(`Somehow could not find workspace for api ${apiId}. This should never happen.`);
			throw new HTTPException({
				message: `An internal error occurred.`,
				reason: 'INTERNAL_SERVER_ERROR',
			});
		}

		if (currentSigningSecret.algorithm === 'hsa256') {
			const signingSecret = await crypto.subtle.generateKey(
				{
					name: 'HMAC',
					hash: { name: 'SHA-256' },
				},
				true,
				['sign', 'verify']
			);

			const exportedSigningSecret = Buffer.from(await crypto.subtle.exportKey('raw', signingSecret)).toString('base64');

			const encryptResult = await keyManagementService.encryptWithDataKey(
				workspace.dataEncryptionKeyId,
				Buffer.from(exportedSigningSecret, 'base64')
			);

			const { id: nextSigningSecretId } = await db.rotateApiSigningSecret({
				apiId: api.id,
				algorithm: 'hsa256',
				encryptedSigningSecret: Buffer.from(encryptResult.encryptedData).toString('base64'),
				iv: Buffer.from(encryptResult.iv).toString('base64'),
				expiresAt: expiresAt,
			});

			return c.json(
				{
					id: nextSigningSecretId,
				},
				200
			);
		} else if (currentSigningSecret.algorithm === 'rsa256') {
			const keyPair = await crypto.subtle.generateKey(
				{
					name: 'RSASSA-PKCS1-v1_5',
					modulusLength: 2048,
					publicExponent: new Uint8Array([1, 0, 1]),
					hash: { name: 'SHA-256' },
				},
				true,
				['sign', 'verify']
			);

			const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
			const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

			const encryptResult = await keyManagementService.encryptWithDataKey(workspace.dataEncryptionKeyId, Buffer.from(privateKey));

			const { id: nextSigningSecretId } = await db.rotateApiSigningSecret({
				apiId: api.id,
				algorithm: 'rsa256',
				encryptedSigningSecret: Buffer.from(encryptResult.encryptedData).toString('base64'),
				iv: Buffer.from(encryptResult.iv).toString('base64'),
				expiresAt: expiresAt,
			});

			const url = `${c.env.JWKS_BUCKET_URL}/${workspace.id}/${api.name.replace(/\s/g, '-')}/.well-known/jwks.json`;

			const req = new Request(url, {
				method: 'GET',
			});

			const res = await fetch(req);

			if (res.status !== 200) {
				logger.error(`Public keys for api ${api.id} could not be retrieved.`);

				throw new HTTPException({
					message: `An internal error occurred.`,
					reason: 'INTERNAL_SERVER_ERROR',
				});
			}

			const jwks = JSON.parse(await res.text()) as { keys: (JsonWebKey & { kid: string })[] };

			jwks.keys.push({
				...publicKey,
				kid: nextSigningSecretId,
			});

			await c.env.JWKS_BUCKET.put(`${workspace.id}/${api.name.replace(/\s/g, '-')}/.well-known/jwks.json`, JSON.stringify(jwks), {
				httpMetadata: {
					contentType: 'application/json',
				},
			});

			await scheduler.createOneTimeSchedule({
				at: expiresAt,
				eventType: 'api.signing_secret.expired',
				payload: {
					apiId: api.id,
					signingSecretId: currentSigningSecret.id,
				},
				timestamp: Date.now(),
			});

			return c.json(
				{
					id: nextSigningSecretId,
				},
				200
			);
		}

		logger.error(`Somehow api ${apiId} has an invalid algorithm. This should never happen.`);

		throw new HTTPException({
			message: 'An internal error occurred.',
			reason: 'INTERNAL_SERVER_ERROR',
		});
	});
}
