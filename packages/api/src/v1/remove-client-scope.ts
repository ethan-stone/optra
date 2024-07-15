import { App } from '@/app';
import { HTTPException, errorResponseSchemas } from '@/errors';
import { createRoute, z } from '@hono/zod-openapi';

const route = createRoute({
	method: 'post' as const,
	path: '/v1/clients.removeScope',
	security: [
		{
			outh2: [],
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
							description: 'The name of the scope to remove.',
						}),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Response from removing a scope from an api',
			content: {
				'application/json': {
					schema: z.null(),
				},
			},
		},
		...errorResponseSchemas,
	},
});

export function v1RemoveClientScope(app: App) {
	app.openapi(route, async (c) => {
		const logger = c.get('logger');
		const { db, tokenService } = c.get('root');

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

		logger.info(`Fetching client ${clientId}`);

		const client = await db.getClientById(clientId);

		if (!client || verifiedToken.client.forWorkspaceId !== client.workspaceId) {
			logger.info(`Could not find client ${clientId} or client ${verifiedToken.client.id} is not allowed to modify it.`);
			throw new HTTPException({
				message: `Could not find client ${clientId}`,
				reason: 'NOT_FOUND',
			});
		}

		logger.info(`Fetched client ${client.id}`);

		logger.info(`Fetching api ${client.apiId}`);

		const api = await db.getApiById(client.apiId);

		if (!api) {
			logger.info(`Could not find api ${client.apiId} for client ${client.id}. This shouldn't happen.`);
			throw new HTTPException({
				message: 'An internal error occurred.',
				reason: 'INTERNAL_SERVER_ERROR',
			});
		}

		logger.info(`Fetched api ${api.id}`);

		const scope = api.scopes.find((s) => s.name === scopeName);

		if (!scope) {
			logger.info(`Could not find scope ${scopeName} on api ${api.id}. This isn't an error.`);
			return c.json(null, 200);
		}

		logger.info(`Removing scope ${scope.name} from client ${client.id}`);

		await db.deleteClientScopeByApiScopeId(scope.id);

		logger.info(`Removed scope ${scope.name} from client ${client.id}`);

		return c.json(null, 200);
	});
}
