import { OpenAPIHono } from '@hono/zod-openapi';
import { prettyJSON } from 'hono/pretty-json';

export function createApp() {
	const app = new OpenAPIHono({});

	app.use(prettyJSON());

	app.doc('/openapi.json', {
		openapi: '3.0.0',
		info: {
			title: 'Optra Api',
			version: '1.0.0',
		},
	});

	return app;
}

export type App = ReturnType<typeof createApp>;
