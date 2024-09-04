import { createApp } from '@/app';
import { initialize } from '@/root';
import { envSchema } from '@/env';
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
import { handle } from 'hono/aws-lambda';
import { Resource } from 'sst';

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

	const result = envSchema.safeParse(process.env);

	if (!result.success) {
		console.log(result.error);
		throw result.error;
	}

	const parsedEnv = result.data;

	try {
		const reqId = uid('req', 14);
		c.set('reqId', reqId);

		const root = await initialize({
			env: parsedEnv.ENVIRONMENT,
			dbUrl: Resource.DbUrl.value,
			awsAccessKeyId: Resource.AWSAccessKeyId.value,
			awsSecretAccessKey: Resource.AWSSecretAccessKey.value,
			awsKMSKeyArn: parsedEnv.AWS_KMS_KEY_ARN,
			awsMessageQueueArn: parsedEnv.AWS_MESSAGE_QUEUE_ARN,
			awsSchedulerRoleArn: parsedEnv.AWS_SCHEDULER_ROLE_ARN,
			awsSchedulerFailedDLQ: parsedEnv.AWS_SCHEDULER_FAILED_DLQ,
			awsS3BucketArn: Resource.JwksBucket.name,
			awsS3PublicUrl: `https://` + parsedEnv.AWS_S3_PUBLIC_URL,
			tinyBirdApiKey: Resource.TinyBirdApiKey.value,
			tinyBirdBaseUrl: Resource.TinyBirdUrl.value,
			tinyBirdMonthlyVerificationsEndpoint: Resource.TinyBirdVerificationsEndpoint.value,
			tinyBirdMonthlyGenerationsEndpoint: Resource.TinyBirdGenerationsEndpoint.value,
		});

		c.set('root', {
			storage: root.storage,
			cache: root.cache,
			db: root.db,
			keyManagementService: root.keyManagementService,
			scheduler: root.scheduler,
			tokenService: root.tokenService,
		});

		let logger: Logger;

		logger = new Logger({
			env: parsedEnv.ENVIRONMENT,
			dataset: 'api-logs',
			namespace: c.req.method + ' ' + c.req.path,
			service: 'api',
			requestId: reqId,
		});

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
		const root = c.get('root');

		const duration = Date.now() - start;

		logger.info('Request finished', {
			duration,
		});
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

export const handler = handle(app);
