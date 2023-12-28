import { App } from '@/app';
import { verifyAuthHeader, verifyToken } from '@/authorizers';
import { HTTPException, errorResponseSchemas } from '@/errors';
import { db } from '@/root';
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
	method: 'post',
	path: '/v1/clients.createClient',
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
						apiId: z.string(),
						rateLimitBucketSize: z.number().int().optional(),
						rateLimitRefillAmount: z.number().int().optional(),
						rateLimitRefillInterval: z.number().int().optional(),
						metadata: z
							.record(z.string().min(1), z.union([z.number(), z.string(), z.boolean()]))
							.optional()
							.refine(
								(value) => {
									if (value === undefined) return true;
									const stringified = JSON.stringify(value);
									const sizeInBytes = getStringSizeInBytes(stringified);
									return sizeInBytes <= 1024;
								},
								{ message: 'Metadata size can not be larger than 1KB' }
							),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Response from creating a client',
			content: {
				'application/json': {
					schema: z.object({
						clientId: z.string(),
						clientSecret: z.string(),
					}),
				},
			},
		},
		...errorResponseSchemas,
	},
});

export function makeV1CreateClient(app: App) {
	app.openapi(route, async (c) => {
		const logger = c.get('logger');

		const { apiId, name, rateLimitBucketSize, rateLimitRefillAmount, rateLimitRefillInterval, metadata } = c.req.valid('json');

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

		const api = await db.getApiById(apiId);

		if (!api || api.workspaceId !== verifiedToken.client.forWorkspaceId) {
			logger.info(`Api with id ${apiId} does not exist or does not belong to the root clients workspace.`);
			throw new HTTPException({
				reason: 'BAD_REQUEST',
				message: 'The api that you are trying to create a client for does not exist',
			});
		}

		const now = new Date();

		const { id, secret } = await db.createBasicClient({
			apiId,
			name,
			version: 1,
			workspaceId: verifiedToken.client.forWorkspaceId,
			rateLimitBucketSize,
			rateLimitRefillAmount,
			rateLimitRefillInterval,
			metadata,
			createdAt: now,
			updatedAt: now,
		});

		logger.info(`Successfully created client with id ${id}`);

		return c.json(
			{
				clientId: id,
				clientSecret: secret,
			},
			200
		);
	});
}
