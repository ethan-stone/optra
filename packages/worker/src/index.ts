import { createApp } from '@/app';
import { initialize } from '@/root';
import { Env, envSchema } from '@/env';
import { makeGetOAuthToken } from './v1/get-oauth-token';

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

makeGetOAuthToken(app);

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
		});

		return app.fetch(request, parsedEnv.data, ctx);
	},
};
