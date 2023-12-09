import { App } from '@/app';
import { createRoute, z } from '@hono/zod-openapi';
import { db } from '@/root';
import { schema } from '@/db';
import { uid } from '@/uid';

const route = createRoute({
	method: 'get',
	path: '/example',
	responses: {
		200: {
			description: 'Example response',
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

export const addExample = (app: App) => {
	app.openapi(route, async (c) => {
		const { id } = await db.createWorkspace({
			name: 'Hello world',
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		return c.json({
			id,
		});
	});
};
