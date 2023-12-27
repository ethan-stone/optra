import { App } from '@/app';
import { errorResponseSchemas } from '@/errors';
import { createRoute, z } from '@hono/zod-openapi';

const route = createRoute({
	method: 'post',
	path: '/v1/clients.rotateSecret',
	request: {
		body: {
			required: true,
			content: {
				'application/json': {
					schema: z.object({
						clientId: z.string(),
						expiresAt: z.string().datetime(), // milliseconds since epoch
					}),
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Response from rotating a client secret',
			content: {
				'application/json': {
					schema: z.object({
						id: z.string(),
						clientId: z.string(),
						secret: z.string(),
						expiresAt: z.string().datetime(),
						createdAt: z.string().datetime(),
					}),
				},
			},
		},
		...errorResponseSchemas,
	},
});

export function makeV1RotateSecret(app: App) {}
