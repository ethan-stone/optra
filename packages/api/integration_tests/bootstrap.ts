import { bootstrap } from '@optra/bootstrap';
import * as schema from '@optra/db/schema';
import { connect } from '@planetscale/database';
import {
	DRIZZLE_DATABASE_URL,
	AWS_ACCESS_KEY_ID,
	AWS_KMS_KEY_ARN,
	AWS_SECRET_ACCESS_KEY,
	CF_ACCESS_KEY_ID,
	CF_SECRET_ACCESS_KEY,
	CF_R2_ENDPOINT,
} from './env';
import { drizzle } from 'drizzle-orm/planetscale-serverless';
import { writeFileSync } from 'fs';
import { KMSClient } from '@aws-sdk/client-kms';
import { S3Client } from '@aws-sdk/client-s3';

function format(obj: Record<string, any>): string {
	return Object.entries(obj)
		.map(([key, value]) => `${key}=${value}`)
		.join('\n');
}

export async function bootstrapTests() {
	const connection = connect({
		url: DRIZZLE_DATABASE_URL,
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
	});

	writeFileSync('./.env.test', dataStr);
}

bootstrapTests();
