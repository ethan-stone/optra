import { createApp } from '@/app';
import { initialize } from '@/root';
import { Env, envSchema } from '@/env';
import { v1GetOAuthToken } from '@/v1/get-oauth-token';
import { v1CreateApi } from '@/v1/create-api';
import { uid } from '@/uid';
import { Logger } from '@/logger';
import { v1CreateClient } from '@/v1/create-client';
import { v1VerifyToken } from '@/v1/verify-token';
import { v1GetClient } from '@/v1/get-client';
import { v1RotateClientSecret } from '@/v1/rotate-client-secret';
import { v1AddApiScope } from '@/v1/add-api-scope';
import { v1RemoveApiScope } from '@/v1/remove-api-scope';
import { v1AddClientScope } from '@/v1/add-client-scope';
import { v1RemoveClientScope } from '@/v1/remove-client-scope';
import { v1DeleteClient } from './v1/delete-client';
import { v1DeleteApi } from '@/v1/delete-api';
import { v1GetApi } from '@/v1/get-api';
import { v1RotateApiSigningSecret } from '@/v1/rotate-api-signing-secret';
import { v1UpdateClient } from '@/v1/update-client';

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export const app = createApp();

app.use('*', async (c, next) => {
	const start = Date.now();

	try {
		const reqId = uid('req', 14);
		c.set('reqId', reqId);

		let logger: Logger;

		if (c.env.ENVIRONMENT === 'production' && !c.env.BASELIME_API_KEY) {
			throw new Error('Missing Axiom environment variables for production');
		}

		if (c.env.ENVIRONMENT === 'production' && c.env.BASELIME_API_KEY) {
			logger = new Logger({
				env: c.env.ENVIRONMENT,
				baseLimeApiKey: c.env.BASELIME_API_KEY,
				executionCtx: c.executionCtx,
				dataset: 'api-logs',
				namespace: c.req.method + ' ' + c.req.path,
				service: 'api',
				requestId: reqId,
			});
		} else {
			logger = new Logger({
				env: 'development',
				dataset: 'api-logs',
				namespace: c.req.method + ' ' + c.req.path,
				service: 'api',
				requestId: reqId,
			});
		}

		c.set('logger', logger);

		logger.info('Request received');

		await next();

		c.res.headers.append('Optra-Request-Id', reqId);
	} catch (error) {
		const logger = c.get('logger');

		logger.error('Error in request', {
			error: error,
		});

		throw error;
	} finally {
		const logger = c.get('logger');

		const duration = Date.now() - start;

		logger.info('Request finished', {
			duration,
		});

		c.executionCtx.waitUntil(logger.flush());
	}
});

v1GetOAuthToken(app);
v1CreateApi(app);
v1GetApi(app);
v1DeleteApi(app);
v1AddApiScope(app);
v1RemoveApiScope(app);
v1RotateApiSigningSecret(app);
v1CreateClient(app);
v1GetClient(app);
v1UpdateClient(app);
v1DeleteClient(app);
v1AddClientScope(app);
v1RemoveClientScope(app);
v1RotateClientSecret(app);
v1VerifyToken(app);

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const parsedEnv = envSchema.safeParse(env);

		if (!parsedEnv.success)
			return Response.json(
				{
					errors: parsedEnv.error,
					message: "Environment variables didn't match the expected schema",
					code: 'INVALID_ENVIRONMENT',
				},
				{ status: 500 },
			);

		initialize({
			dbUrl: env.DRIZZLE_DATABASE_URL,
			dbAuthToken: env.DRIZZLE_DATABASE_TOKEN,
			env: env.ENVIRONMENT,
			awsAccessKeyId: env.AWS_ACCESS_KEY_ID,
			awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY,
			awsKMSKeyArn: env.AWS_KMS_KEY_ARN,
			awsMessageQueueArn: env.AWS_MESSAGE_QUEUE_ARN,
			awsSchedulerRoleArn: env.AWS_SCHEDULER_ROLE_ARN,
			awsSchedulerFailedDLQ: env.AWS_SCHEDULER_FAILED_DQL,
			tinyBirdApiKey: env.TINY_BIRD_API_KEY,
			tinyBirdBaseUrl: env.TINY_BIRD_BASE_URL,
			tinyBirdMonthlyVerificationsEndpoint: env.TINY_BIRD_MONTHLY_VERIFICATIONS_ENDPOINT,
			tinyBirdMonthlyGenerationsEndpoint: env.TINY_BIRD_MONTHLY_GENERATIONS_ENDPOINT,
		});

		return app.fetch(request, parsedEnv.data, ctx);
	},
};
