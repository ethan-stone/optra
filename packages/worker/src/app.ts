import { OpenAPIHono } from '@hono/zod-openapi';
import { prettyJSON } from 'hono/pretty-json';

export function createApp() {
	const app = new OpenAPIHono({});

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
