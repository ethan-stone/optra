import { Db } from '@/db';
import { TokenBucket } from '@/ratelimit';
import { KMSClient } from '@aws-sdk/client-kms';
import { Cache, CacheNamespaces, InMemoryCache } from '@/cache';
import { AWSEventScheduler, Scheduler } from '@/scheduler';
import { SchedulerClient } from '@aws-sdk/client-scheduler';
import { TokenService } from '@/token-service';
import { AWSS3Storage } from './storage';
import { S3Client } from '@aws-sdk/client-s3';
import { DrizzleWorkspaceRepo } from '@optra/core/workspaces';
import { DrizzleApiRepo } from '@optra/core/apis';
import { DrizzleClientRepo } from '@optra/core/clients';
import { DrizzleClientSecretRepo } from '@optra/core/client-secrets';
import { DrizzleSigningSecretRepo } from '@optra/core/signing-secrets';
import { getDrizzle } from '@optra/core/drizzle';
import { AWSKeyManagementService } from '@optra/core/key-management';
import { DrizzleTokenGenerationRepo } from '@optra/core/token-generations';
import { DrizzleTokenVerificationRepo } from '@optra/core/token-verifications';

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
	awsSchedulerFailedDLQ: string;
	awsS3BucketArn: string;
	awsS3PublicUrl: string;
	tinyBirdApiKey?: string;
	tinyBirdBaseUrl?: string;
	tinyBirdMonthlyVerificationsEndpoint?: string;
	tinyBirdMonthlyGenerationsEndpoint?: string;
}) {
	const { db: drizzleClient } = await getDrizzle(env.dbUrl);

	const db = {
		workspaces: new DrizzleWorkspaceRepo(drizzleClient),
		apis: new DrizzleApiRepo(drizzleClient),
		clients: new DrizzleClientRepo(drizzleClient),
		clientSecrets: new DrizzleClientSecretRepo(drizzleClient),
		signingSecrets: new DrizzleSigningSecretRepo(drizzleClient),
		tokenGenerations: new DrizzleTokenGenerationRepo(drizzleClient),
		tokenVerifications: new DrizzleTokenVerificationRepo(drizzleClient),
	};

	const keyManagementService = new AWSKeyManagementService(
		drizzleClient,
		env.awsKMSKeyArn,
		'us-east-1',
		env.awsAccessKeyId,
		env.awsSecretAccessKey,
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

	const storage = new AWSS3Storage(
		new S3Client({
			credentials: {
				accessKeyId: env.awsAccessKeyId,
				secretAccessKey: env.awsSecretAccessKey,
			},
			region: 'us-east-1',
		}),
		env.awsS3BucketArn,
		env.awsS3PublicUrl,
	);

	const tokenService = new TokenService(db, keyManagementService, cache, tokenBuckets, storage);

	return {
		db,
		storage,
		conn: drizzleClient,
		cache,
		scheduler,
		tokenService,
		keyManagementService,
	};
}
