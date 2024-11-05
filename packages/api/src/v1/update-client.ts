import { App } from '@/app';
import { HTTPException } from '@/errors';
import { createRoute, z } from '@hono/zod-openapi';

function getStringSizeInBytes(str: string): number {
	let sizeInBytes = 0;
	for (let i = 0; i < str.length; i++) {
		const charCode = str.charCodeAt(i);
		if (charCode < 0x80) {
			sizeInBytes += 1;
		} else if (charCode < 0x800) {
			sizeInBytes += 2;
		} else if (charCode < 0xd800 || charCode >= 0xe000) {
			sizeInBytes += 3;
		} else {
			// Surrogate pair
			i++;
			sizeInBytes += 4;
		}
	}
	return sizeInBytes;
}

const route = createRoute({
	operationId: 'updateClient',
	method: 'patch' as const,
	path: '/v1/clients.updateClient',
	summary: 'Update a Client',
	description: 'Update a client by providing a rate limit bucket size, refill amount, refill interval, and metadata',
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
						clientId: z.string(),
						rateLimitBucketSize: z.number().int().optional(),
						rateLimitRefillAmount: z.number().int().optional(),
						rateLimitRefillInterval: z.number().int().optional(),
						metadata: z
							.record(z.unknown())
							.optional()
							.refine(
								(value) => {
									if (value === undefined) return true;
									const stringified = JSON.stringify(value);
									const sizeInBytes = getStringSizeInBytes(stringified);
									return sizeInBytes <= 1024;
								},
								{ message: 'Metadata size can not be larger than 1KB' },
							)
							.openapi({ description: 'Metadata that will be attached to the client. Can be at most 1KB' }),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Response from updating a client',
			content: {
				'application/json': {
					schema: z.null(),
				},
			},
		},
	},
});

export function v1UpdateClient(app: App) {
	app.openapi(route, async (c) => {
		const logger = c.get('logger');
		const { db, tokenService } = c.get('root');

		const { clientId, rateLimitBucketSize, rateLimitRefillAmount, rateLimitRefillInterval, metadata } = c.req.valid('json');

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
			logger.info(`Token is not valid. Reason ${verifiedToken.reason}`);
			throw new HTTPException({
				message: verifiedToken.message,
				reason: verifiedToken.reason,
			});
		}

		if (!verifiedToken.client.forWorkspaceId) {
			logger.info(`Client with id ${verifiedToken.client.id} is not a root client. Can not create apis.`);
			throw new HTTPException({
				reason: 'FORBIDDEN',
				message: 'This route can only be used by root clients',
			});
		}

		const clientToUpdate = await db.clients.getById(clientId);

		if (!clientToUpdate || verifiedToken.client.forWorkspaceId !== clientToUpdate.workspaceId) {
			logger.info(`Client with id ${clientId} does not exist or client ${verifiedToken.client.id} does not have access to it`);
			throw new HTTPException({
				reason: 'NOT_FOUND',
				message: 'Client does not exist',
			});
		}

		await db.clients.update(clientId, {
			metadata,
			rateLimitBucketSize,
			rateLimitRefillAmount,
			rateLimitRefillInterval,
		});

		return c.json(null, 200);
	});
}
