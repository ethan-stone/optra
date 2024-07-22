import { App } from '@/app';
import { ClientSecret } from '@/db';
import { hashSHA256, sign } from '@/crypto-utils';
import { createRoute, z } from '@hono/zod-openapi';
import { HTTPException, errorResponseSchemas } from '@/errors';

const bodySchema = z.object({
	clientId: z.string(),
	clientSecret: z.string(),
	grantType: z.enum(['client_credentials']),
});

const res = z.object({
	accessToken: z.string(),
	tokenType: z.string(),
	expiresIn: z.number().int(),
	scope: z.string().nullish(),
});

export type GetOAuthTokenRes = z.infer<typeof res>;

const route = createRoute({
	method: 'post' as const,
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
		const root = c.get('root');

		const { db, analytics, keyManagementService, cache } = root;

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

		const secretIds = [client.currentClientSecretId];
		if (client.nextClientSecretId) secretIds.push(client.nextClientSecretId);

		let matchedClientSecret: ClientSecret | null = null;

		for (const secretId of secretIds) {
			const secretValue = await db.getClientSecretValueById(secretId);

			if (!secretValue) {
				throw new HTTPException({
					reason: 'FORBIDDEN',
					message: 'Could not generate token for client',
				});
			}

			const hashedClientSecret = await hashSHA256(clientSecret);

			if (hashedClientSecret === secretValue) {
				matchedClientSecret = await db.getClientSecretById(secretId);
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

		const workspaceTokenGenerations = await cache.fetchOrPopulate(
			{ logger },
			'tokenGenerationsByWorkspaceId',
			workspace.id,
			async (key) => {
				const now = new Date();
				const year = now.getUTCFullYear();
				const month = now.getUTCMonth() + 1;

				const res = await analytics.getGenerationsForWorkspace({
					workspaceId: key,
					month,
					year,
				});

				return {
					total: res.total,
				};
			},
		);

		// check if workspace has reached token generation limit
		if ((!workspace.billingInfo || !workspace.billingInfo.subscriptions) && workspaceTokenGenerations.total >= 2000) {
			logger.info(`Workspace ${workspace.id} has reached free tier limit`);

			throw new HTTPException({
				reason: 'FORBIDDEN',
				message: 'Could not generate token for client',
			});
		}

		const currentSigningSecret = await db.getSigningSecretById(api.currentSigningSecretId);
		const nextSigningSecret = api.nextSigningSecretId ? await db.getSigningSecretById(api.nextSigningSecretId) : null;

		if (!currentSigningSecret) {
			logger.info(`Could not find signing secret ${api.currentSigningSecretId} for api ${api.id}`);

			throw new HTTPException({
				reason: 'INTERNAL_SERVER_ERROR',
				message: 'An internal error occurred.',
			});
		}

		// prioritize the next signing secret if it exists
		const signingSecretToUse = nextSigningSecret ? nextSigningSecret : currentSigningSecret;

		// decrypt the signing secret
		const decryptResult = await keyManagementService.decryptWithDataKey(
			workspace.dataEncryptionKeyId,
			Buffer.from(signingSecretToUse.secret, 'base64'),
			Buffer.from(signingSecretToUse.iv, 'base64'),
		);

		switch (signingSecretToUse.algorithm) {
			case 'hsa256': {
				// sign the jwt with the signing secret
				const jwt = await sign(
					{
						exp: Math.floor(now.getTime() / 1000) + api.tokenExpirationInSeconds,
						iat: Math.floor(now.getTime() / 1000),
						sub: client.id,
						secret_expires_at: matchedClientSecret.expiresAt ? matchedClientSecret.expiresAt.getTime() / 1000 : null,
						version: client.version,
						scope: client.scopes?.join(' '),
						metadata: client.metadata,
					},
					Buffer.from(decryptResult.decryptedData).toString('base64'),
					{ algorithm: 'HS256', header: { typ: 'JWT', kid: signingSecretToUse.id } },
				);

				logger.info(`Created JWT for client ${clientId}`);

				// c.executionCtx.waitUntil(
				// 	analytics.publish('token.generated', [
				// 		{
				// 			apiId: client.apiId,
				// 			clientId: client.id,
				// 			workspaceId: client.workspaceId,
				// 			timestamp: Date.now(),
				// 		},
				// 	]),
				// );

				return c.json(
					{
						accessToken: jwt,
						tokenType: 'Bearer',
						expiresIn: api.tokenExpirationInSeconds,
						scope: client.scopes?.join(' '),
					},
					200,
				);
			}

			case 'rsa256': {
				const privateKey =
					'-----BEGIN PRIVATE KEY-----\n' + Buffer.from(decryptResult.decryptedData).toString('base64') + '\n-----END PRIVATE KEY-----';

				const jwt = await sign(
					{
						exp: Math.floor(now.getTime() / 1000) + api.tokenExpirationInSeconds,
						iat: Math.floor(now.getTime() / 1000),
						sub: client.id,
						secret_expires_at: matchedClientSecret.expiresAt ? matchedClientSecret.expiresAt.getTime() / 1000 : null,
						version: client.version,
						scope: client.scopes?.join(' '), // scope is a space delimited string according to the rfc. https://datatracker.ietf.org/doc/html/rfc6749#section-3.3
						metadata: client.metadata,
					},
					privateKey,
					{ algorithm: 'RS256', header: { typ: 'JWT', kid: signingSecretToUse.id } },
				);

				// c.executionCtx.waitUntil(
				// 	analytics.publish('token.generated', [
				// 		{
				// 			apiId: client.apiId,
				// 			clientId: client.id,
				// 			workspaceId: client.workspaceId,
				// 			timestamp: Date.now(),
				// 		},
				// 	]),
				// );

				return c.json(
					{
						accessToken: jwt,
						tokenType: 'Bearer',
						expiresIn: api.tokenExpirationInSeconds,
						scope: client.scopes?.join(' '),
					},
					200,
				);
			}

			default: {
				logger.error(`Unknown signing secret algorithm ${signingSecretToUse.algorithm}`);
				throw new HTTPException({
					message: 'An internal error occurred.',
					reason: 'INTERNAL_SERVER_ERROR',
				});
			}
		}
	});
}
