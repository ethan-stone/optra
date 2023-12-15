import { describe, expect, it } from 'vitest';
import { testEnv } from './test-env';
import { getOAuthToken } from './helpers';

const env = testEnv.parse(process.env);

describe('POST /v1/apis.createApi', () => {
	it('should reject if invalid body', async () => {
		const token = await getOAuthToken(env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request('http://localhost:8787/v1/apis.createApi', {
			method: 'POST',
			body: JSON.stringify({}), // missing fields
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		const res = await fetch(req);
		const resJson = await res.json();

		expect(res.status).toBe(400);
	});
});
