import { createConnection, Db, PlanetScaleDb } from '@/db';
import { TokenBucket } from '@/ratelimit';
import { KeyManagementService, AWSKeyManagementService } from '@/key-management';
import { KMSClient } from '@aws-sdk/client-kms';

export let db: Db;
export const tokenBuckets: Map<string, TokenBucket> = new Map();
export let keyManagementService: KeyManagementService;

let hasInitialized = false;

export function initialize(env: {
	env: 'development' | 'production';
	dbUrl: string;
	awsAccessKeyId: string;
	awsSecretAccessKey: string;
	awsKMSKeyArn: string;
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

	hasInitialized = true;
}
