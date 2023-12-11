import { App } from '@/app';
import { verifyAuthHeader, verifyToken } from '@/authorizers';
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
		400: {
			description: 'The request parameters are invalid',
			content: {
				'application/json': {
					schema: z.object({
						reason: z.string(),
						message: z.string(),
					}),
				},
			},
		},
	},
});

export function makeV1CreateApi(app: App) {
	app.openapi(route, async (c) => {
		const { name, scopes } = c.req.valid('json');

		const verifiedAuthHeader = await verifyAuthHeader(c.req.header('Authorization'));

		if (!verifiedAuthHeader.valid) {
			return c.json(
				{
					reason: 'BAD_REQUEST',
					message: verifiedAuthHeader.message,
				},
				400
			);
		}

		const verifiedToken = await verifyToken(verifiedAuthHeader.token, c.env.JWT_SECRET);

		return c.json({
			id: '123',
		});
	});
}
