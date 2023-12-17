import { describe, expect, it } from 'vitest';
import { testEnv } from './test-env';
import { GetOAuthTokenRes } from '@/v1/get-oauth-token';

const env = testEnv.parse(process.env);

describe('POST /v1/oauth/token', () => {
	it('should get oauth token', async () => {
		const req = new Request(`${env.BASE_URL}/v1/oauth/token`, {
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

	it('should respond with 400 bad request if request body is invalid', async () => {
		const req = new Request(`${env.BASE_URL}/v1/oauth/token`, {
			method: 'POST',
			body: JSON.stringify({}), // missing fields
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const res = await fetch(req);

		expect(res.status).toBe(400);
	});

	it('should respond with 403 forbidden client is not found', async () => {
		const req = new Request(`${env.BASE_URL}/v1/oauth/token`, {
			method: 'POST',
			body: JSON.stringify({
				grantType: 'client_credentials',
				clientId: 'fake client',
				clientSecret: env.ROOT_CLIENT_SECRET,
			}),
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const res = await fetch(req);

		expect(res.status).toBe(403);
	});

	it('should respond with 403 forbidden if no secret matches', async () => {
		const req = new Request(`${env.BASE_URL}/v1/oauth/token`, {
			method: 'POST',
			body: JSON.stringify({
				grantType: 'client_credentials',
				clientId: env.ROOT_CLIENT_ID,
				clientSecret: 'fake secret',
			}),
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const res = await fetch(req);

		expect(res.status).toBe(403);
	});
});
