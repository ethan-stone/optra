import { createConnection, Db, PostgresDb, schema } from '@/db';
import { TokenBucket } from '@/ratelimit';
import { KeyManagementService, AWSKeyManagementService } from '@/key-management';
import { KMSClient } from '@aws-sdk/client-kms';
import { Cache, CacheNamespaces, InMemoryCache } from '@/cache';
import { AWSEventScheduler, Scheduler } from '@/scheduler';
import { SchedulerClient } from '@aws-sdk/client-scheduler';
import { TokenService } from '@/token-service';
import { Analytics, NoopAnalytics, TinyBirdAnalytics } from '@/analytics';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { Sql } from 'postgres';

const cache = new InMemoryCache<CacheNamespaces>({
	ttl: 60 * 1000, // 1 minute
});

export function initialize(env: {
	env: 'development' | 'production';
	dbUrl: string;
	awsAccessKeyId: string;
	awsSecretAccessKey: string;
	awsKMSKeyArn: string;
	awsMessageQueueArn: string;
	awsSchedulerRoleArn: string;
	awsSchedulerFailedDLQ: string;
	tinyBirdApiKey?: string;
	tinyBirdBaseUrl?: string;
	tinyBirdMonthlyVerificationsEndpoint?: string;
	tinyBirdMonthlyGenerationsEndpoint?: string;
}) {
	const sql = postgres(env.dbUrl);

	const conn = drizzle(sql, { schema: schema });

	const db = new PostgresDb(conn);

	const keyManagementService = new AWSKeyManagementService(
		new KMSClient({
			credentials: {
				accessKeyId: env.awsAccessKeyId,
				secretAccessKey: env.awsSecretAccessKey,
			},
			region: 'us-east-1',
		}),
		conn,
		env.awsKMSKeyArn,
	);

	const scheduler = new AWSEventScheduler(
		new SchedulerClient({
			credentials: {
				accessKeyId: env.awsAccessKeyId,
				secretAccessKey: env.awsSecretAccessKey,
			},
			region: 'us-east-1',
		}),
		{
			roleArn: env.awsSchedulerRoleArn,
			eventTypeToTargetMap: {
				'api.signing_secret.expired': { arn: env.awsMessageQueueArn },
				'client.secret.expired': { arn: env.awsMessageQueueArn },
			},
			dlqArn: env.awsSchedulerFailedDLQ,
		},
	);

	const analytics =
		env.env === 'production' &&
		env.tinyBirdApiKey &&
		env.tinyBirdMonthlyVerificationsEndpoint &&
		env.tinyBirdMonthlyGenerationsEndpoint &&
		env.tinyBirdBaseUrl
			? new TinyBirdAnalytics({
					apiKey: env.tinyBirdApiKey,
					baseUrl: 'https://api.us-east.aws.tinybird.co',
					eventTypeDatasourceMap: {
						'token.generated': 'token_generated__v0',
						'token.verified': 'token_verified__v0',
					},
					verificationForWorkspaceEndpoint: env.tinyBirdMonthlyVerificationsEndpoint,
					generationsForWorkspaceEndpoint: env.tinyBirdMonthlyGenerationsEndpoint,
				})
			: new NoopAnalytics();

	const tokenBuckets: Map<string, TokenBucket> = new Map();

	const tokenService = new TokenService(db, keyManagementService, cache, tokenBuckets, analytics);

	return {
		sql,
		db,
		conn,
		cache,
		analytics,
		scheduler,
		tokenService,
		keyManagementService,
	};
}
