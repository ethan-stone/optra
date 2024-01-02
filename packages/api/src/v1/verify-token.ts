import { App } from '@/app';
import { verifyToken } from '@/authorizers';
import { ErrorReason, errorResponseSchemas } from '@/errors';
import { createRoute, z } from '@hono/zod-openapi';

const verifyTokenResponseSchema = z.discriminatedUnion('valid', [
	z.object({
		valid: z.literal(true),
		name: z.string(),
		clientId: z.string(),
		metadata: z.record(z.unknown()).nullish(),
		rateLimitBucketSize: z.number().int().nullish(),
		rateLimitRefillAmount: z.number().int().nullish(),
		rateLimitRefillInterval: z.number().int().nullish(),
		scopes: z.array(z.string()).nullish(),
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
						requiredScopes: z
							.object({
								method: z.enum(['one', 'all']).openapi({
									description:
										'The method to use when checking scopes. "one" means that the token must have at least one of the scopes. "all" means that the token must have all of the scopes.',
								}),
								names: z.array(z.string()).openapi({ description: 'The names of the scopes to check for.' }),
							})
							.nullish(),
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

export function v1VerifyToken(app: App) {
	app.openapi(route, async (c) => {
		const logger = c.get('logger');

		logger.info(`Verifying token`);

		const { token, requiredScopes } = c.req.valid('json');

		const verifiedToken = await verifyToken(token, c, {
			requiredScopes,
		});

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
				clientId: verifiedToken.client.id,
				metadata: verifiedToken.client.metadata,
				name: verifiedToken.client.name,
				rateLimitBucketSize: verifiedToken.client.rateLimitBucketSize,
				rateLimitRefillAmount: verifiedToken.client.rateLimitRefillAmount,
				rateLimitRefillInterval: verifiedToken.client.rateLimitRefillInterval,
				scopes: verifiedToken.client.scopes,
			},
			200
		);
	});
}
