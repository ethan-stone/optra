import { createConnection, Db, PlanetScaleDb } from '@/db';
import { TokenBucket } from '@/ratelimit';
import { KeyManagementService, AWSKeyManagementService } from '@/key-management';
import { KMSClient } from '@aws-sdk/client-kms';
import { Cache, CacheNamespaces, InMemoryCache } from '@/cache';
import { AWSEventScheduler, Scheduler } from '@/scheduler';
import { SchedulerClient } from '@aws-sdk/client-scheduler';

export let db: Db;
export const tokenBuckets: Map<string, TokenBucket> = new Map();
export let keyManagementService: KeyManagementService;
export let cache: Cache<CacheNamespaces>;
export let scheduler: Scheduler;

let hasInitialized = false;

export function initialize(env: {
	env: 'development' | 'production';
	dbUrl: string;
	awsAccessKeyId: string;
	awsSecretAccessKey: string;
	awsKMSKeyArn: string;
	awsSecretExpiredTargetArn: string;
	awsSchedulerRoleArn: string;
	awsScheduleFailedDLQ: string;
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
			secretExpiredTarget: {
				arn: env.awsSecretExpiredTargetArn,
			},
			dlqArn: env.awsScheduleFailedDLQ,
		}
	);

	hasInitialized = true;
}
