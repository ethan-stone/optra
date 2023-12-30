import { App } from '@/app';
import { uid } from '@/uid';
import { createRoute, z } from '@hono/zod-openapi';

const route = createRoute({
	path: '/v1/test.R2',
	method: 'get',
	responses: {
		200: {
			description: 'OK',
			content: {
				'application/json': {
					schema: z.object({}),
				},
			},
		},
	},
});

export function testR2(app: App) {
	app.openapi(route, async (c) => {
		const obj = await c.env.JWKS_BUCKET.get('zNZQfm6zMApgEcYGjyHcU.json');

		if (!obj) return c.json({}, 200);

		return c.json(JSON.parse(await obj.text()), 200);
	});
}
