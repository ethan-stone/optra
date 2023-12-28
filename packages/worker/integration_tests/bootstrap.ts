import { bootstrap } from '@optra/bootstrap';
import { schema } from '@optra/db';
import { connect } from '@planetscale/database';
import { DRIZZLE_DATABASE_URL, AWS_ACCESS_KEY_ID, AWS_KMS_KEY_ARN, AWS_SECRET_ACCESS_KEY } from './env';
import { drizzle } from 'drizzle-orm/planetscale-serverless';
import { writeFileSync } from 'fs';
import { KMSClient } from '@aws-sdk/client-kms';

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

	const data = await bootstrap(db, kmsClient, AWS_KMS_KEY_ARN);

	const dataStr = format({
		...data,
		BASE_URL: 'http://localhost:8787',
	});

	writeFileSync('./.env.test', dataStr);
}

bootstrapTests();
