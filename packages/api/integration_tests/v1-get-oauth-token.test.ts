import { describe, expect, it } from 'vitest';
import { testEnvSchema } from './test-env-schema';
import { GetOAuthTokenRes } from '@/v1/get-oauth-token';

const env = testEnvSchema.parse(process.env);

describe('POST /v1/oauth/token', () => {
	it('should get oauth token', async () => {
		const res = await fetch(`${env.TEST_BASE_URL}/v1/oauth/token`, {
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
		const resJson = (await res.json()) as GetOAuthTokenRes;

		expect(res.status).toBe(200);
		expect(resJson.accessToken).toBeDefined();
		expect(resJson.expiresIn).toBeDefined();
		expect(resJson.tokenType).toBeDefined();
	});

	it('should respond with 400 BAD_REQUEST if request body is invalid', async () => {
		const res = await fetch(`${env.TEST_BASE_URL}/v1/oauth/token`, {
			method: 'POST',
			body: JSON.stringify({}), // missing fields
			headers: {
				'Content-Type': 'application/json',
			},
		});

		expect(res.status).toBe(400);
	});

	it('should respond with 403 FORBIDDEN client is not found', async () => {
		const res = await fetch(`${env.TEST_BASE_URL}/v1/oauth/token`, {
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

		expect(res.status).toBe(403);
	});

	it('should respond with 403 FORBIDDEN if no secret matches', async () => {
		const res = await fetch(`${env.TEST_BASE_URL}/v1/oauth/token`, {
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

		expect(res.status).toBe(403);
	});
});
