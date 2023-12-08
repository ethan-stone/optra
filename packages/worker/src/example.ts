import { App } from '@/app';
import { createRoute, z } from '@hono/zod-openapi';

const route = createRoute({
	method: 'get',
	path: '/example',
	responses: {
		200: {
			description: 'Example response',
			content: {
				'application/json': {
					schema: z.object({
						message: z.string(),
					}),
				},
			},
		},
	},
});

export const addExample = (app: App) => {
	app.openapi(route, async (c) => {
		return c.json({
			message: 'Hello world',
		});
	});
};
