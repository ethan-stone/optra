import { App } from '@/app';
import { HTTPException, errorResponseSchemas } from '@/errors';
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
	operationId: 'createClient',
	method: 'post' as const,
	path: '/v1/clients.createClient',
	summary: 'Create a Client',
	description: 'Create a client for an api by providing a name and the api it is for. Can also specify scopes and metadata.',
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
						clientIdPrefix: z.string().max(12).optional(),
						clientSecretPrefix: z.string().max(12).optional(),
						rateLimitBucketSize: z.number().int().optional(),
						rateLimitRefillAmount: z.number().int().optional(),
						rateLimitRefillInterval: z.number().int().optional(),
						scopes: z.array(z.string()).optional().openapi({
							description:
								'Default scope names that will be assigned to the client. If some of the scopes do not exist for they api they will be ignored.',
						}),
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

export function v1CreateClient(app: App) {
	app.openapi(route, async (c) => {
		const logger = c.get('logger');
		const { db, tokenService } = c.get('root');

		const {
			apiId,
			name,
			rateLimitBucketSize,
			rateLimitRefillAmount,
			rateLimitRefillInterval,
			metadata,
			scopes,
			clientIdPrefix,
			clientSecretPrefix,
		} = c.req.valid('json');

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

		const api = await db.apis.getById(apiId);

		if (!api || api.workspaceId !== verifiedToken.client.forWorkspaceId) {
			logger.info(`Api with id ${apiId} does not exist or does not belong to the root clients workspace.`);
			throw new HTTPException({
				reason: 'BAD_REQUEST',
				message: 'The api that you are trying to create a client for does not exist',
			});
		}

		const matchingScopes = api.scopes.filter((scope) => (scopes ? scopes.includes(scope.name) : false));

		const now = new Date();

		const { id, secret } = await db.clients.createBasic({
			apiId,
			name,
			version: 1,
			clientIdPrefix: clientIdPrefix,
			clientSecretPrefix: clientSecretPrefix,
			workspaceId: verifiedToken.client.forWorkspaceId,
			rateLimitBucketSize,
			rateLimitRefillAmount,
			rateLimitRefillInterval,
			metadata,
			apiScopes: matchingScopes.map((scope) => scope.id),
			createdAt: now,
			updatedAt: now,
		});

		logger.info(`Successfully created client with id ${id}`);

		return c.json(
			{
				clientId: id,
				clientSecret: secret,
			},
			200,
		);
	});
}
