import { Db, PostgresDb, schema } from '@/db';
import { TokenBucket } from '@/ratelimit';
import { KeyManagementService, AWSKeyManagementService } from '@/key-management';
import { KMSClient } from '@aws-sdk/client-kms';
import { Cache, CacheNamespaces, InMemoryCache } from '@/cache';
import { AWSEventScheduler, Scheduler } from '@/scheduler';
import { SchedulerClient } from '@aws-sdk/client-scheduler';
import { TokenService } from '@/token-service';
import { Analytics, NoopAnalytics, TinyBirdAnalytics } from '@/analytics';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';

const cache = new InMemoryCache<CacheNamespaces>({
	ttl: 60 * 1000, // 1 minute
});

const tokenBuckets: Map<string, TokenBucket> = new Map();

export async function initialize(env: {
	env: 'development' | 'production';
	dbUrl: string;
	awsAccessKeyId: string;
	awsSecretAccessKey: string;
	awsKMSKeyArn: string;
	awsMessageQueueArn: string;
	awsSchedulerRoleArn: string;
	awsSchedulerFailedDLQArn: string;
	tinyBirdApiKey?: string;
	tinyBirdBaseUrl?: string;
	tinyBirdMonthlyVerificationsEndpoint?: string;
	tinyBirdMonthlyGenerationsEndpoint?: string;
}) {
	const sql = new Client({
		connectionString: env.dbUrl,
	});
	await sql.connect();

	const conn = drizzle(sql, { schema });

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
			dlqArn: env.awsSchedulerFailedDLQArn,
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
