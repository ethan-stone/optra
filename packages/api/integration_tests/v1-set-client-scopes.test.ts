import { describe, expect, it } from 'vitest';
import { testEnvSchema } from './test-env-schema';
import { getOAuthToken } from './helpers';

const env = testEnvSchema.parse(process.env);

describe('POST /v1/clients.setScopes', () => {
	it('should respond with 400 BAD_REQUEST if invalid body', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const res = await fetch(`${env.TEST_BASE_URL}/v1/clients.setScopes`, {
			method: 'POST',
			body: JSON.stringify({}), // missing fields
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		const resJson = await res.json();

		expect(res.status).toBe(400);
		expect(resJson).toHaveProperty('reason');
		expect((resJson as any).reason).toBe('BAD_REQUEST');
		expect(resJson).toHaveProperty('message');
	});

	it('should response with 404 NOT_FOUND if client does not exist', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const res = await fetch(`${env.TEST_BASE_URL}/v1/clients.setScopes`, {
			method: 'POST',
			body: JSON.stringify({
				clientId: 'non-existent-client-id',
				scopeNames: ['test-scope'],
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		const resJson = await res.json();

		expect(res.status).toBe(404);
		expect(resJson).toHaveProperty('reason');
		expect((resJson as any).reason).toBe('NOT_FOUND');
		expect(resJson).toHaveProperty('message');
	});

	it('should respond with 404 NOT_FOUND if api does not have scope provided', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const res = await fetch(`${env.TEST_BASE_URL}/v1/clients.setScopes`, {
			method: 'POST',
			body: JSON.stringify({
				clientId: env.BASIC_CLIENT_ID,
				scopeNames: ['non-existent-scope'],
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		const resJson = await res.json();

		expect(res.status).toBe(404);
		expect(resJson).toHaveProperty('reason');
		expect((resJson as any).reason).toBe('NOT_FOUND');
		expect(resJson).toHaveProperty('message');
	});

	it('should respond with 200 OK if scopes are set', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const res = await fetch(`${env.TEST_BASE_URL}/v1/clients.setScopes`, {
			method: 'POST',
			body: JSON.stringify({
				clientId: env.BASIC_CLIENT_ID,
				scopeNames: ['example-scope'],
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		expect(res.status).toBe(200);
	});
});
