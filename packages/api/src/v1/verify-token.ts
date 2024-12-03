import { App } from '@/app';
import { ErrorReason, errorResponseSchemas } from '@/errors';
import { createRoute, z } from '@hono/zod-openapi';
import { scopeQuerySchema } from '@optra/scopes/index';

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
	operationId: 'verifyToken',
	method: 'post' as const,
	path: '/v1/tokens.verifyToken',
	summary: 'Verify a Token',
	description: 'Verify a token by providing the token and the scopes that are required',
	request: {
		body: {
			content: {
				'application/json': {
					schema: z.object({
						token: z.string(),
						scopeQuery: scopeQuerySchema.nullish().openapi({
							description:
								'The scopes that the token must have. This is a query language for scopes that is more powerful than the simple scopes that are used in the OAuth2.0 spec.',
						}),
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
		const { tokenService } = c.get('root');

		logger.info(`Verifying token`);

		const { token, scopeQuery } = c.req.valid('json');

		const verifiedToken = await tokenService.verifyToken(token, c, {
			scopeQuery: scopeQuery ?? undefined,
		});

		if (!verifiedToken.valid) {
			logger.info(`Token is invalid. Reason: ${verifiedToken.reason}`);

			return c.json<VerifyTokenResponse, 200>(
				{
					valid: false,
					message: verifiedToken.message,
					reason: verifiedToken.reason,
				},
				200,
			);
		}

		logger.info(`Token is valid for client ${verifiedToken.client.id}`);

		return c.json<VerifyTokenResponse, 200>(
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
			200,
		);
	});
}
