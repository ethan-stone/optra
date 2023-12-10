import { describe, expect, it } from 'vitest';
import { testEnv } from './test-env';
import { GetOAuthTokenRes } from '@/v1/get-oauth-token';

const env = testEnv.parse(process.env);

describe('v1-get-oauth-token', () => {
	it('should get oauth token', async () => {
		const req = new Request('http://localhost:8787/v1/oauth/token', {
			method: 'POST',
			body: JSON.stringify({
				grantType: 'client_credentials',
				clientId: env.ROOT_CLIENT_ID,
				clientSecret: env.ROOT_CLIENT_SECRET,
			}),
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const res = await fetch(req);
		const resJson = (await res.json()) as GetOAuthTokenRes;

		expect(res.status).toBe(200);
		expect(resJson.accessToken).toBeDefined();
		expect(resJson.expiresIn).toBeDefined();
		expect(resJson.tokenType).toBeDefined();
	});
});
