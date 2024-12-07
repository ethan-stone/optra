import { App } from '@/app';
import { errorResponseSchemas, HTTPException } from '@/errors';
import { createRoute, z } from '@hono/zod-openapi';

const route = createRoute({
	operationId: 'setClientScopes',
	method: 'post' as const,
	path: '/v1/clients.setScopes',
	summary: 'Set the scopes for a client',
	description:
		'Set the scopes for a client by providing the client id and the scopes to set. Effectively this deletes all the scopes the client has and replaces them with the new scopes in a single operation.',
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
						scopeNames: z.array(z.string()),
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

export function v1SetClientScopes(app: App) {
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

		const { clientId, scopeNames } = c.req.valid('json');

		const client = await db.clients.getById(clientId);

		if (client === null) {
			logger.info(`Client with id ${clientId} does not exist`);
			throw new HTTPException({
				message: `Client with id ${clientId} does not exist.`,
				reason: 'NOT_FOUND',
			});
		}

		const verifiedToken = await tokenService.verifyToken(verifiedAuthHeader.token, c, {
			mustBeRootClient: true,
			scopeQuery: {
				or: ['api:update_client:*', `api:update_client:${client.apiId}`],
			},
		});

		if (!verifiedToken.valid) {
			logger.info(`Token is not valid. Reason: ${verifiedToken.reason}`);
			throw new HTTPException({
				message: verifiedToken.message,
				reason: verifiedToken.reason,
			});
		}

		if (verifiedToken.client.forWorkspaceId !== client.workspaceId) {
			logger.info(`Client ${clientId} does not exist or is not a part of workspace ${verifiedToken.client.forWorkspaceId}`);
			throw new HTTPException({
				message: `Client ${clientId} does not exist or is not a part of workspace ${verifiedToken.client.forWorkspaceId}`,
				reason: 'NOT_FOUND',
			});
		}

		const api = await db.apis.getById(client.apiId);

		if (!api) {
			logger.info(`Somehow api ${client.apiId} for client ${client.id} does not exist.`);
			throw new HTTPException({
				message: 'An internal error occurred',
				reason: 'INTERNAL_SERVER_ERROR',
			});
		}

		logger.info(`Checking if scopes ${scopeNames} exist on api ${api.id}`);

		const apiScopesNames = api.scopes.map((s) => s.name);

		// check if all scopes exist on the api

		const scopesNotFound: string[] = [];

		for (const scopeName of scopeNames) {
			if (!apiScopesNames.includes(scopeName)) {
				logger.info(`Scope ${scopeName} does not exist on api ${api.id}`);
				scopesNotFound.push(scopeName);
			}
		}

		if (scopesNotFound.length > 0) {
			logger.info(`Scopes ${scopesNotFound} do not exist on api ${api.id}`);
			throw new HTTPException({
				message: `Scopes ${scopesNotFound} do not exist on api ${api.id}`,
				reason: 'NOT_FOUND',
			});
		}

		logger.info(`Scopes ${scopeNames} exist on api ${api.id}`);

		logger.info(`Setting scopes on client ${client.id}`);

		await db.clients.setScopes({
			clientId: client.id,
			workspaceId: client.workspaceId,
			apiScopeIds: scopeNames,
		});

		return c.json({}, 200);
	});
}
