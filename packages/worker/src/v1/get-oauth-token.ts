import { App } from '@/app';
import { ClientSecret } from '@/db';
import { hashSHA256, sign } from '@/crypto-utils';
import { createRoute, z } from '@hono/zod-openapi';
import { db } from '@/root';
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

export function makeV1GetOAuthToken(app: App) {
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

		const secrets = await db.getClientSecretsByClientId(client.id);

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

		const jwt = await sign(
			{
				exp: Math.floor(now.getTime() / 1000) + 60 * 60 * 24,
				iat: Math.floor(now.getTime() / 1000),
				sub: client.id,
				secret_expires_at: null,
				version: 1,
			},
			c.env.JWT_SECRET,
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
