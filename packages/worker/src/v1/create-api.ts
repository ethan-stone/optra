import { App } from '@/app';
import { createRoute, z } from '@hono/zod-openapi';

const route = createRoute({
	method: 'post',
	path: '/v1/apis.createApi',
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
						scopes: z.array(
							z.object({
								name: z.string(),
								description: z.string(),
							})
						),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Response from creating an api',
			content: {
				'application/json': {
					schema: z.object({
						id: z.string(),
					}),
				},
			},
		},
	},
});

export function makeV1CreateApi(app: App) {
	app.openapi(route, async (c) => {
		const { name, scopes } = c.req.valid('json');

		return c.json({
			id: '123',
		});
	});
}
