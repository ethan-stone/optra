import { Db, PostgresDb, schema } from '@/db';
import { TokenBucket } from '@/ratelimit';
import { KeyManagementService, AWSKeyManagementService } from '@/key-management';
import { KMSClient } from '@aws-sdk/client-kms';
import { Cache, CacheNamespaces, InMemoryCache } from '@/cache';
import { AWSEventScheduler, Scheduler } from '@/scheduler';
import { SchedulerClient } from '@aws-sdk/client-scheduler';
import { TokenService } from '@/token-service';
import { Analytics, NoopAnalytics, SQSAndPgAnalytics, TinyBirdAnalytics } from '@/analytics';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { SQSClient } from '@aws-sdk/client-sqs';

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
	awsMessageQueueUrl: string;
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

	const sqsClient = new SQSClient({
		region: 'us-east-1',
		credentials: {
			accessKeyId: env.awsAccessKeyId,
			secretAccessKey: env.awsSecretAccessKey,
		},
	});

	const analytics = env.env === 'development' ? new SQSAndPgAnalytics(sqsClient, env.awsMessageQueueUrl) : new NoopAnalytics();

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
