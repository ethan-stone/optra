import { App } from '@/app';
import { verifyToken } from '@/authorizers';
import { ErrorReason, errorResponseSchemas } from '@/errors';
import { createRoute, z } from '@hono/zod-openapi';

const verifyTokenResponseSchema = z.discriminatedUnion('valid', [
	z.object({
		valid: z.literal(true),
	}),
	z.object({
		valid: z.literal(false),
		message: z.string(),
		reason: ErrorReason,
	}),
]);

export type VerifyTokenResponse = z.infer<typeof verifyTokenResponseSchema>;

const route = createRoute({
	method: 'post',
	path: '/v1/tokens.verifyToken',
	request: {
		body: {
			content: {
				'application/json': {
					schema: z.object({
						token: z.string(),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Verify token responses',
			content: {
				'application/json': {
					schema: verifyTokenResponseSchema,
				},
			},
		},
		...errorResponseSchemas,
	},
});

export function makeV1VerifyToken(app: App) {
	app.openapi(route, async (c) => {
		const logger = c.get('logger');

		logger.info(`Verifying token`);

		const { token } = c.req.valid('json');

		const verifiedToken = await verifyToken(token, { logger });

		if (!verifiedToken.valid) {
			logger.info(`Token is invalid. Reason: ${verifiedToken.reason}`);

			return c.json<VerifyTokenResponse>(
				{
					valid: false,
					message: verifiedToken.message,
					reason: verifiedToken.reason,
				},
				200
			);
		}

		logger.info(`Token is valid for client ${verifiedToken.client.id}`);

		return c.json<VerifyTokenResponse>(
			{
				valid: true,
			},
			200
		);
	});
}
