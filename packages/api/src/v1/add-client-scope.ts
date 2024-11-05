import { App } from '@/app';
import { HTTPException, errorResponseSchemas } from '@/errors';
import { createRoute, z } from '@hono/zod-openapi';

const route = createRoute({
	operationId: 'addClientScope',
	method: 'post' as const,
	path: '/v1/clients.addScope',
	summary: 'Add a Scope to a Client',
	description: 'Add a scope to a client by providing the scope name. This API this client is for must have the scope.',
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
						scopeName: z.string().openapi({
							description: 'The scope id or name from the api to add to the client.',
						}),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Response from adding a scope to an api',
			content: {
				'application/json': {
					schema: z.object({}),
				},
			},
		},
		...errorResponseSchemas,
	},
});

export function v1AddClientScope(app: App) {
	app.openapi(route, async (c) => {
		const logger = c.get('logger');
		const { tokenService, db } = c.get('root');

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

		const { clientId, scopeName } = c.req.valid('json');

		const client = await db.clients.getById(clientId);

		if (!client || verifiedToken.client.forWorkspaceId !== client.workspaceId) {
			logger.info(`Could not find client ${clientId} or client ${verifiedToken.client.id} is not allowed to modify it.`);
			throw new HTTPException({
				message: `Could not find client ${clientId}`,
				reason: 'NOT_FOUND',
			});
		}

		const api = await db.apis.getById(client.apiId);

		if (!api) {
			logger.error(`Somehow api ${client.apiId} for client ${client.id} does not exist.`);
			throw new HTTPException({
				message: 'An internal error occurred',
				reason: 'INTERNAL_SERVER_ERROR',
			});
		}

		logger.info(`Checking if api ${api.id} has scope ${scopeName}`);

		const scope = api.scopes.find((s) => s.name === scopeName);

		if (!scope) {
			logger.info(`Could not find scope ${scopeName} on api ${api.id}`);
			// consider making this a bad request instead of not found
			throw new HTTPException({
				message: `Could not find scope ${scopeName} on api ${api.id}`,
				reason: 'NOT_FOUND',
			});
		}

		logger.info(`Api ${api.id} has scope ${scope.id}`);

		logger.info(`Checking if client ${client.id} already has scope ${scope.id}`);

		const clientScopes = await db.clients.getScopesByClientId(client.id);

		if (clientScopes.find((s) => s.apiScopeId === scope.id)) {
			logger.info(`Client ${client.id} already has scope ${scope.id}`);
			throw new HTTPException({
				message: `Client ${client.id} already has scope ${scope.id}`,
				reason: 'CONFLICT',
			});
		}

		logger.info(`Client ${client.id} does not have scope ${scope.id}`);

		const now = new Date();

		logger.info(`Adding scope ${scope.id} to client ${client.id}`);

		await db.clients.createScope({
			apiScopeId: scope.id,
			clientId: client.id,
			workspaceId: client.workspaceId,
			createdAt: now,
			updatedAt: now,
		});

		logger.info(`Added scope ${scope.id} to client ${client.id}`);

		return c.json({}, 200);
	});
}
