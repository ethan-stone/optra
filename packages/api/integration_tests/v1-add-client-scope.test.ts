import { describe, expect, it } from 'vitest';
import { testEnvSchema } from './test-env-schema';
import { getOAuthToken } from './helpers';

const env = testEnvSchema.parse(process.env);

describe('POST /v1/clients.addScope', () => {
	it('should respond with 400 BAD_REQUEST if invalid body', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const res = await fetch(`${env.TEST_BASE_URL}/v1/clients.addScope`, {
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

	it('should respond with 404 NOT_FOUND if client does not exist', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const res = await fetch(`${env.TEST_BASE_URL}/v1/clients.addScope`, {
			method: 'POST',
			body: JSON.stringify({
				clientId: 'non-existent-client-id',
				scopeName: 'test-scope',
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

		const res = await fetch(`${env.TEST_BASE_URL}/v1/clients.addScope`, {
			method: 'POST',
			body: JSON.stringify({
				clientId: env.BASIC_CLIENT_ID,
				scopeName: 'non-existent-scope',
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

		const res = await fetch(`${env.TEST_BASE_URL}/v1/clients.addScope`, {
			method: 'POST',
			body: JSON.stringify({
				clientId: env.BASIC_CLIENT_ID,
				scopeName: 'non-existent-scope',
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

	it('should respond with 409 CONFLICT if client already has scope', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		// request 1 will add the scope
		const res1 = await fetch(`${env.TEST_BASE_URL}/v1/clients.addScope`, {
			method: 'POST',
			body: JSON.stringify({
				clientId: env.BASIC_CLIENT_ID,
				scopeName: 'example-scope',
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		expect(res1.status).toBe(200);

		// request 2 should fail with 409
		const res2 = await fetch(`${env.TEST_BASE_URL}/v1/clients.addScope`, {
			method: 'POST',
			body: JSON.stringify({
				clientId: env.BASIC_CLIENT_ID,
				scopeName: 'example-scope',
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});
		const res2Json = await res2.json();

		expect(res2.status).toBe(409);
		expect(res2Json).toHaveProperty('reason');
		expect((res2Json as any).reason).toBe('CONFLICT');
		expect(res2Json).toHaveProperty('message');
	});

	it('should respond with 200 OK if scope is added', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const res = await fetch(`${env.TEST_BASE_URL}/v1/clients.addScope`, {
			method: 'POST',
			body: JSON.stringify({
				clientId: env.BASIC_CLIENT_ID,
				scopeName: 'another-example-scope',
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		expect(res.status).toBe(200);
	});
});
