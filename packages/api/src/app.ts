import { OpenAPIHono } from '@hono/zod-openapi';
import { prettyJSON } from 'hono/pretty-json';
import { LambdaEvent } from 'hono/aws-lambda';
import { handleError, handleZodError } from './errors';
import { Logger } from './logger';
import { Db } from './db';
import { KeyManagementService } from '@optra/core/key-management';
import { Cache, CacheNamespaces } from './cache';
import { Scheduler } from './scheduler';
import { TokenService } from './token-service';
import { Storage } from './storage';

type Root = {
	db: Db;
	keyManagementService: KeyManagementService;
	storage: Storage;
	cache: Cache<CacheNamespaces>;
	scheduler: Scheduler;
	tokenService: TokenService;
};

export type HonoEnv = {
	Bindings: {
		event: LambdaEvent;
	};
	Variables: {
		reqId: string;
		logger: Logger;
		root: Root;
	};
};

export function createApp() {
	const app = new OpenAPIHono<HonoEnv>({
		defaultHook: handleZodError,
	});

	app.onError(handleError);
	app.use(prettyJSON());

	app.openAPIRegistry.registerComponent('securitySchemes', 'oauth2', {
		type: 'oauth2',
		description: 'OAuth2 Client Credentials Flow',
		flows: {
			clientCredentials: {
				tokenUrl: 'https://api.optra.pebble.sh/v1/oauth/token',
				scopes: {},
			},
		},
	});

	app.doc('/openapi.json', {
		openapi: '3.1.0',
		info: {
			title: 'Optra Api',
			version: '1.0.0',
		},
		servers: [
			{
				url: 'https://api.optra.pebble.sh',
			},
		],
		security: [
			{
				oauth2: [],
			},
		],
	});

	return app;
}

export type App = ReturnType<typeof createApp>;
