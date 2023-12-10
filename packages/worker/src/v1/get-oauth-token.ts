import { App } from '@/app';
import { ClientSecret } from '@/db';
import { hashSHA256, sign } from '@/crypto-utils';
import { createRoute, z } from '@hono/zod-openapi';
import { db } from '@/root';

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
		400: {
			description: 'The request parameters are invalid',
			content: {
				'application/json': {
					schema: z.object({
						error: z.string(),
					}),
				},
			},
		},
	},
});

export function makeGetOAuthToken(app: App) {
	app.openapi(route, async (c) => {
		const { clientId, clientSecret, grantType } = c.req.valid('json');

		const client = await db.getClientById(clientId);

		if (client === null) {
			return c.json(
				{
					error: 'invalid_request',
				},
				400
			);
		}

		const secrets = await db.getClientSecretsByClientId(client.id);

		let matchedClientSecret: ClientSecret | null = null;

		for (const secret of secrets) {
			const secretValue = await db.getClientSecretValueById(secret.id);

			if (!secretValue) {
				return c.json(
					{
						error: 'invalid_request',
					},
					400
				);
			}

			const hashedClientSecret = await hashSHA256(clientSecret);

			if (hashedClientSecret === secretValue) {
				matchedClientSecret = secret;
				break;
			}
		}

		if (matchedClientSecret === null) {
			return c.json(
				{
					error: 'invalid_request',
				},
				400
			);
		}

		if (grantType !== 'client_credentials') {
			return c.json(
				{
					error: 'unsupported_grant_type',
				},
				400
			);
		}

		const now = new Date();

		const jwt = await sign(
			{
				exp: Math.floor(now.getTime() / 1000) + 60 * 60 * 24 * 30,
				iat: Math.floor(now.getTime() / 1000),
				sub: 'root',
				secret_expires_at: null,
				version: 1,
			},
			c.env.JWT_SECRET,
			'HS256'
		);

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
