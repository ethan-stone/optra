import { TokenBucket } from '@/ratelimit';
import { CacheNamespaces, InMemoryCache } from '@/cache';
import { AWSEventScheduler } from '@optra/core/scheduler';
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
	awsMessageQueueUrl: string;
	awsSchedulerRoleArn: string;
	awsSchedulerFailedDLQ: string;
	awsS3BucketArn: string;
	awsS3PublicUrl: string;
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
		{
			roleArn: env.awsSchedulerRoleArn,
			eventTypeToTargetMap: {
				'api.signing_secret.expired': { arn: env.awsMessageQueueArn },
				'client.secret.expired': { arn: env.awsMessageQueueArn },
			},
			dlqArn: env.awsSchedulerFailedDLQ,
		},
		'us-east-1',
		env.awsAccessKeyId,
		env.awsSecretAccessKey,
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
