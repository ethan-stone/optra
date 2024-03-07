import { bootstrap } from '@optra/bootstrap';
import * as schema from '@optra/db/schema';
import { createClient } from '@libsql/client';
import {
	DRIZZLE_DATABASE_URL,
	AWS_ACCESS_KEY_ID,
	AWS_KMS_KEY_ARN,
	AWS_SECRET_ACCESS_KEY,
	CF_ACCESS_KEY_ID,
	CF_SECRET_ACCESS_KEY,
	CF_R2_ENDPOINT,
	DRIZZLE_DATABASE_TOKEN,
} from './env';
import { drizzle } from 'drizzle-orm/libsql';
import { writeFileSync } from 'fs';
import { KMSClient } from '@aws-sdk/client-kms';
import { S3Client } from '@aws-sdk/client-s3';

function format(obj: Record<string, any>): string {
	return Object.entries(obj)
		.map(([key, value]) => `${key}=${value}`)
		.join('\n');
}

export async function bootstrapTests() {
	const connection = createClient({
		url: DRIZZLE_DATABASE_URL,
		authToken: DRIZZLE_DATABASE_TOKEN,
	});

	const db = drizzle(connection, {
		schema,
	});

	const kmsClient = new KMSClient({
		credentials: {
			accessKeyId: AWS_ACCESS_KEY_ID,
			secretAccessKey: AWS_SECRET_ACCESS_KEY,
		},
	});

	const s3Client = new S3Client({
		credentials: {
			accessKeyId: CF_ACCESS_KEY_ID,
			secretAccessKey: CF_SECRET_ACCESS_KEY,
		},
		endpoint: CF_R2_ENDPOINT,
		region: 'auto',
	});

	const data = await bootstrap(db, kmsClient, s3Client, AWS_KMS_KEY_ARN);

	const dataStr = format({
		...data,
		BASE_URL: 'http://localhost:8787',
		JWKS_BUCKET_URL: 'https://pub-a5afc02c7f8144f0b982fd75f6846a06.r2.dev',
	});

	writeFileSync('./.env.test', dataStr);
}

bootstrapTests();
