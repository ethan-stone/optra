import { createConnection, Db, PlanetScaleDb } from '@/db';
import { TokenBucket } from '@/ratelimit';
import { KeyManagementService, AWSKeyManagementService } from '@/key-management';
import { KMSClient } from '@aws-sdk/client-kms';
import { Cache, CacheNamespaces, InMemoryCache } from '@/cache';
import { AWSEventScheduler, Scheduler } from '@/scheduler';
import { SchedulerClient } from '@aws-sdk/client-scheduler';
import { TokenService } from '@/token-service';
import { Analytics, NoopAnalytics, TinyBirdAnalytics } from '@/analytics';

export let db: Db;
export const tokenBuckets: Map<string, TokenBucket> = new Map();
export let keyManagementService: KeyManagementService;
export let cache: Cache<CacheNamespaces>;
export let scheduler: Scheduler;
export let tokenService: TokenService;
export let analytics: Analytics;

let hasInitialized = false;

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
}) {
	if (hasInitialized) {
		return;
	}

	const conn = createConnection(env.dbUrl);

	db = new PlanetScaleDb(conn);

	keyManagementService = new AWSKeyManagementService(
		new KMSClient({
			credentials: {
				accessKeyId: env.awsAccessKeyId,
				secretAccessKey: env.awsSecretAccessKey,
			},
			region: 'us-east-1',
		}),
		conn,
		env.awsKMSKeyArn
	);

	cache = new InMemoryCache<CacheNamespaces>({
		ttl: 60 * 1000, // 1 minute
	});

	scheduler = new AWSEventScheduler(
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
		}
	);

	analytics =
		env.env === 'production' && env.tinyBirdApiKey
			? new TinyBirdAnalytics({
					apiKey: env.tinyBirdApiKey,
					baseUrl: 'https://api.us-east.aws.tinybird.co',
					eventTypeDatasourceMap: {
						'token.generated': 'token_generated__v0',
						'token.verified': 'token_verified__v0',
					},
			  })
			: new NoopAnalytics();

	tokenService = new TokenService(db, keyManagementService, cache, tokenBuckets, analytics);

	hasInitialized = true;
}
