import { App } from '@/app';
import { ClientSecret } from '@/db';
import { hashSHA256, sign } from '@/crypto-utils';
import { createRoute, z } from '@hono/zod-openapi';
import { db, keyManagementService } from '@/root';
import { HTTPException, errorResponseSchemas } from '@/errors';
import { Buffer } from '@/buffer';

const bodySchema = z.object({
	clientId: z.string(),
	clientSecret: z.string(),
	grantType: z.enum(['client_credentials']),
});

const res = z.object({
	accessToken: z.string(),
	tokenType: z.string(),
	expiresIn: z.number().int(),
	scope: z.string().nullable(),
});

export type GetOAuthTokenRes = z.infer<typeof res>;

const route = createRoute({
	method: 'post',
	path: '/v1/oauth/token',
	request: {
		body: {
			content: {
				'application/json': {
					schema: bodySchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Response from creating an api',
			content: {
				'application/json': {
					schema: res,
				},
			},
		},
		...errorResponseSchemas,
	},
});

export function v1GetOAuthToken(app: App) {
	app.openapi(route, async (c) => {
		const logger = c.get('logger');

		const { clientId, clientSecret } = c.req.valid('json');

		const client = await db.getClientById(clientId);

		if (client === null) {
			logger.info(`Client ${clientId} not found`);

			throw new HTTPException({
				reason: 'FORBIDDEN',
				message: 'Could not generate token for client',
			});
		}

		logger.info(`Got client ${clientId}`);

		const secrets = await db.getClientSecretsByClientId(client.id, {
			excludeExpired: true,
			status: 'active',
		});

		let matchedClientSecret: ClientSecret | null = null;

		for (const secret of secrets) {
			const secretValue = await db.getClientSecretValueById(secret.id);

			if (!secretValue) {
				throw new HTTPException({
					reason: 'FORBIDDEN',
					message: 'Could not generate token for client',
				});
			}

			const hashedClientSecret = await hashSHA256(clientSecret);

			if (hashedClientSecret === secretValue) {
				matchedClientSecret = secret;
				break;
			}
		}

		if (matchedClientSecret === null) {
			logger.info(`Could not find mathing client secret for client ${clientId}`);

			throw new HTTPException({
				reason: 'FORBIDDEN',
				message: 'Could not generate token for client',
			});
		}

		logger.info(`Found matching client secret for client ${clientId}`);

		const now = new Date();

		const workspace = await db.getWorkspaceById(client.workspaceId);

		const api = await db.getApiById(client.apiId);

		if (!workspace || !api) {
			logger.error(`Could not find workspace or api for client ${clientId}`);

			throw new HTTPException({
				reason: 'INTERNAL_SERVER_ERROR',
				message: 'An internal error occurred.',
			});
		}

		const signingSecret = await db.getSigningSecretById(api.signingSecretId);

		if (!signingSecret) {
			logger.info(`Could not find signing secret ${api.signingSecretId} for api ${api.id}`);

			throw new HTTPException({
				reason: 'INTERNAL_SERVER_ERROR',
				message: 'An internal error occurred.',
			});
		}

		// decrypt the signing secret
		const decryptResult = await keyManagementService.decryptWithDataKey(
			workspace.dataEncryptionKeyId,
			Buffer.from(signingSecret.secret, 'base64'),
			Buffer.from(signingSecret.iv, 'base64')
		);

		// sign the jwt with the signing secret
		const jwt = await sign(
			{
				exp: Math.floor(now.getTime() / 1000) + 60 * 60 * 24,
				iat: Math.floor(now.getTime() / 1000),
				sub: client.id,
				secret_expires_at: matchedClientSecret.expiresAt ? matchedClientSecret.expiresAt.getTime() / 1000 : null,
				version: client.version,
			},
			Buffer.from(decryptResult.decryptedData).toString('base64'),
			'HS256'
		);

		logger.info(`Created JWT for client ${clientId}`);

		return c.json(
			{
				accessToken: jwt,
				tokenType: 'Bearer',
				expiresIn: 60 * 60 * 24 * 30,
				scope: null,
			},
			200
		);
	});
}
