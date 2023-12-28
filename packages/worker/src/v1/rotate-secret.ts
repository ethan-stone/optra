import { App } from '@/app';
import { verifyAuthHeader, verifyToken } from '@/authorizers';
import { HTTPException, errorResponseSchemas } from '@/errors';
import { db } from '@/root';
import { createRoute, z } from '@hono/zod-openapi';

const route = createRoute({
	method: 'post',
	path: '/v1/clients.rotateSecret',
	request: {
		body: {
			required: true,
			content: {
				'application/json': {
					schema: z.object({
						clientId: z.string(),
						expiresAt: z.string().datetime().nullable().openapi({
							description: 'When the secret should expire. If not provided, or is a time in the past, the secret will expire immediately.',
						}), // milliseconds since epoch
					}),
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Response from rotating a client secret',
			content: {
				'application/json': {
					schema: z.object({
						id: z.string(),
						clientId: z.string(),
						secret: z.string(),
						expiresAt: z.string().datetime().nullable(),
						createdAt: z.string().datetime(),
					}),
				},
			},
		},
		...errorResponseSchemas,
	},
});

export function makeV1RotateSecret(app: App) {
	app.openapi(route, async (c) => {
		const logger = c.get('logger');

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
			logger.info(`Token is not valid. Reason: ${verifiedToken.reason}`);
			throw new HTTPException({
				message: verifiedToken.message,
				reason: verifiedToken.reason,
			});
		}

		const { clientId, expiresAt: providedExpiresAt } = c.req.valid('json');

		// this is the client of which we are rotating the secret
		const secretClient = await db.getClientById(clientId);

		if (!secretClient) {
			logger.info(`Could not find client ${clientId}`);
			throw new HTTPException({
				message: `Could not find client ${clientId}`,
				reason: 'NOT_FOUND',
			});
		}

		const secrets = await db.getClientSecretsByClientId(clientId);

		if (secrets.length === 2) {
			throw new HTTPException({
				message: `Client ${clientId} already has 2 secrets`,
				reason: 'BAD_REQUEST',
			});
		}

		if (secrets.length === 0) {
			logger.error(`Client ${clientId} has no secrets. This should never happen.`);
			throw new HTTPException({
				message: `an internal error occurred.`,
				reason: 'INTERNAL_SERVER_ERROR',
			});
		}

		const currentSecret = secrets[0];

		const callingClient = await db.getClientById(currentSecret.clientId);

		if (!callingClient) {
			logger.error(`Client ${currentSecret.clientId} not found despite being verified. This should never happen.`);
			throw new HTTPException({
				message: `An internal error occurred.`,
				reason: 'INTERNAL_SERVER_ERROR',
			});
		}

		// root clients can rotate secrets for any client in their workspace
		// non-root clients can only rotate secrets for themselves
		if (callingClient.workspaceId !== secretClient.workspaceId && callingClient.id !== secretClient.id) {
			throw new HTTPException({
				message: `Client ${verifiedToken.client.id} is not allowed to rotate secrets for client ${clientId}`,
				reason: 'FORBIDDEN',
			});
		}

		const now = new Date();

		// if the provided expiresAt is in the past, set it to 1 minute from now
		let expiresAt = providedExpiresAt ? new Date(providedExpiresAt) : new Date(now.getTime() + 1000 * 60);

		// if the provided expiresAt is in the past, set it to 1 minute from now
		if (providedExpiresAt && new Date(providedExpiresAt) < now) {
			expiresAt = new Date(now.getTime() + 1000 * 60);
		}

		const newSecret = await db.rotateClientSecret({
			clientId,
			expiresAt: expiresAt,
		});

		return c.json({
			...newSecret,
			createdAt: newSecret.createdAt.toISOString(),
			expiresAt: newSecret.expiresAt?.toISOString() ?? null,
		});
	});
}
