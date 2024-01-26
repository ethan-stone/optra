import { App } from '@/app';
import { HTTPException, errorResponseSchemas } from '@/errors';
import { db, scheduler, tokenService } from '@/root';
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

export function v1RotateClientSecret(app: App) {
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

		const { clientId, expiresIn: providedExpiresIn } = c.req.valid('json');

		const clientFromToken = await db.getClientById(verifiedToken.client.id);

		if (!clientFromToken) {
			logger.error(`Client ${verifiedToken.client.id} not found despite being verified. This should never happen.`);
			throw new HTTPException({
				message: `An internal error occurred.`,
				reason: 'INTERNAL_SERVER_ERROR',
			});
		}

		// this is the client of which we are rotating the secret
		const clientFromRequestParams = await db.getClientById(clientId);

		// root clients can rotate secrets for any client in their workspace
		// non-root clients can only rotate secrets for themselves
		if (
			!clientFromRequestParams ||
			(clientFromToken.forWorkspaceId !== clientFromRequestParams.workspaceId && clientFromToken.id !== clientFromRequestParams.id)
		) {
			logger.info(`Client ${clientId} does not exist or client ${clientFromToken} is not allowed to rotate secrets for client ${clientId}`);
			throw new HTTPException({
				message: `Client ${verifiedToken.client.id} is not allowed to rotate secrets for client ${clientId}`,
				reason: 'NOT_FOUND',
			});
		}

		if (clientFromRequestParams.currentClientSecretId && clientFromRequestParams.nextClientSecretId) {
			throw new HTTPException({
				message: `Client ${clientId} already has 2 secrets`,
				reason: 'BAD_REQUEST',
			});
		}

		const currentSecret = await db.getClientSecretById(clientFromRequestParams.currentClientSecretId);

		if (!currentSecret) {
			logger.error(`Client ${clientId} does not have a current secret despite being verified. This should never happen.`);
			throw new HTTPException({
				message: `An internal error occurred.`,
				reason: 'INTERNAL_SERVER_ERROR',
			});
		}

		const now = new Date();

		// if the provided expiresIn is null, set it to 1 minute
		const expiresIn = providedExpiresIn ?? 1000 * 60;

		const expiresAt = new Date(now.getTime() + expiresIn);

		const newSecret = await db.rotateClientSecret({
			clientId,
			expiresAt,
		});

		await scheduler.createOneTimeSchedule({
			at: expiresAt,
			eventType: 'secret.expired',
			payload: {
				secretId: currentSecret.id,
			},
		});

		return c.json(
			{
				...newSecret,
				clientId: clientFromRequestParams.id,
				createdAt: newSecret.createdAt.toISOString(),
				expiresAt: newSecret.expiresAt?.toISOString() ?? null,
			},
			200
		);
	});
}
