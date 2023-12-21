import { createApp } from '@/app';
import { initialize } from '@/root';
import { Env, envSchema } from '@/env';
import { makeV1GetOAuthToken } from './v1/get-oauth-token';
import { makeV1CreateApi } from './v1/create-api';
import { uid } from '@/uid';
import { Logger } from '@/logger';
import { makeV1CreateClient } from './v1/create-client';
import { makeV1VerifyToken } from './v1/verify-token';
import { makeV1GetClient } from './v1/get-client';

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
	try {
		const reqId = uid('req', 14);
		c.set('reqId', reqId);

		let logger: Logger;

		if (c.env.ENVIRONMENT === 'production' && (!c.env.AXIOM_TOKEN || !c.env.AXIOM_TOKEN || !c.env.AXIOM_ORG_ID)) {
			throw new Error('Missing Axiom environment variables for production');
		}

		if (c.env.ENVIRONMENT === 'production' && c.env.AXIOM_TOKEN && c.env.AXIOM_DATASET && c.env.AXIOM_ORG_ID) {
			logger = new Logger(
				{
					env: c.env.ENVIRONMENT,
					axiomToken: c.env.AXIOM_TOKEN,
					axiomDataset: c.env.AXIOM_DATASET,
					axiomOrgId: c.env.AXIOM_ORG_ID,
				},
				{
					app: 'api',
					requestId: reqId,
					path: c.req.path,
					method: c.req.method,
				}
			);
		} else {
			logger = new Logger(
				{
					env: 'development',
				},
				{
					app: 'api',
					requestId: reqId,
					path: c.req.path,
					method: c.req.method,
				}
			);
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

		logger.info('Request finished');

		c.executionCtx.waitUntil(logger.flush());
	}
});

makeV1GetOAuthToken(app);
makeV1CreateApi(app);
makeV1CreateClient(app);
makeV1VerifyToken(app);
makeV1GetClient(app);

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
				{ status: 500 }
			);

		initialize({
			dbUrl: env.DRIZZLE_DATABASE_URL,
			env: env.ENVIRONMENT,
			axiomDataset: env.AXIOM_DATASET,
			axiomOrgId: env.AXIOM_ORG_ID,
			axiomToken: env.AXIOM_TOKEN,
		});

		return app.fetch(request, parsedEnv.data, ctx);
	},
};
