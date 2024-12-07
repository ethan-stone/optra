import { App } from '@/app';
import { HTTPException, errorResponseSchemas } from '@/errors';
import { createRoute, z } from '@hono/zod-openapi';

const route = createRoute({
	operationId: 'rotateClientSecret',
	method: 'post' as const,
	path: '/v1/clients.rotateSecret',
	summary: 'Rotate a Client Secret',
	description: 'Rotate a client secret by providing an expiration date. It may still take up to a minute for all changes to propagate.',
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
		const { db, scheduler, tokenService } = c.get('root');

		const verifiedAuthHeader = await tokenService.verifyAuthHeader(c.req.header('Authorization'));

		if (!verifiedAuthHeader.valid) {
			logger.info('Could not parse Authorization header');
			throw new HTTPException({
				message: 'Could not parse Authorization header',
				reason: 'BAD_JWT',
			});
		}

		const { clientId, expiresIn: providedExpiresIn } = c.req.valid('json');

		// this is the client of which we are rotating the secret
		const clientFromRequestParams = await db.clients.getById(clientId);

		if (clientFromRequestParams === null) {
			logger.info(`Client with id ${clientId} does not exist`);
			throw new HTTPException({
				message: `Client with id ${clientId} does not exist.`,
				reason: 'NOT_FOUND',
			});
		}

		const verifiedToken = await tokenService.verifyToken(verifiedAuthHeader.token, c, {
			mustBeRootClient: true,
			scopeQuery: {
				or: ['api:update_client:*', `api:update_client:${clientFromRequestParams.apiId}`],
			},
		});

		if (!verifiedToken.valid) {
			logger.info(`Token is not valid. Reason: ${verifiedToken.reason}`);
			throw new HTTPException({
				message: verifiedToken.message,
				reason: verifiedToken.reason,
			});
		}

		const clientFromToken = await db.clients.getById(verifiedToken.client.id);

		if (!clientFromToken) {
			logger.error(`Client ${verifiedToken.client.id} not found despite being verified. This should never happen.`);
			throw new HTTPException({
				message: `An internal error occurred.`,
				reason: 'INTERNAL_SERVER_ERROR',
			});
		}

		if (clientFromToken.forWorkspaceId !== clientFromRequestParams.workspaceId) {
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

		const currentSecret = await db.clientSecrets.getById(clientFromRequestParams.currentClientSecretId);

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

		const newSecret = await db.clientSecrets.rotate({
			clientId,
			expiresAt,
		});

		await scheduler.createOneTimeSchedule({
			at: expiresAt,
			eventType: 'client.secret.expired',
			payload: {
				workspaceId: clientFromRequestParams.workspaceId,
				clientId: clientFromRequestParams.id,
				clientSecretId: currentSecret.id,
			},
			timestamp: Date.now(),
		});

		return c.json(
			{
				...newSecret,
				clientId: clientFromRequestParams.id,
				createdAt: newSecret.createdAt.toISOString(),
				expiresAt: newSecret.expiresAt?.toISOString() ?? null,
			},
			200,
		);
	});
}
