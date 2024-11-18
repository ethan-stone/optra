import { bootstrap } from '@optra/bootstrap';
import {
	DRIZZLE_DATABASE_URL,
	AWS_ACCESS_KEY_ID,
	AWS_KMS_KEY_ARN,
	AWS_SECRET_ACCESS_KEY,
	BUCKET_NAME,
	TEST_BASE_URL,
	JWKS_BASE_URL,
} from './env';
import { writeFileSync } from 'fs';

function format(obj: Record<string, any>): string {
	return Object.entries(obj)
		.map(([key, value]) => `${key}="${value}"`)
		.join('\n');
}

export async function bootstrapTests() {
	const data = await bootstrap(DRIZZLE_DATABASE_URL, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_KMS_KEY_ARN, BUCKET_NAME, JWKS_BASE_URL);

	const dataStr = format({
		...data,
		TEST_BASE_URL,
		JWKS_BASE_URL,
	});

	writeFileSync('./.env.test', dataStr);
}

bootstrapTests();
