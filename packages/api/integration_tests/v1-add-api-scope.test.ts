import { describe, expect, it } from 'vitest';
import { testEnvSchema } from './test-env-schema';
import { getOAuthToken } from './helpers';

const env = testEnvSchema.parse(process.env);

describe('POST /v1/apis.addScope', () => {
	it('should respond with 400 BAD_REQUEST if invalid body', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const res = await fetch(`${env.TEST_BASE_URL}/v1/apis.addScope`, {
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

	it('should respond with 404 NOT_FOUND if api does not exist', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const res = await fetch(`${env.TEST_BASE_URL}/v1/apis.addScope`, {
			method: 'POST',
			body: JSON.stringify({
				apiId: 'non-existent-api-id',
				scope: {
					name: 'test-scope',
					description: 'test-scope-description',
				},
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

	it('should respond with 403 FORBIDDEN if not root client', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.BASIC_CLIENT_ID, env.BASIC_CLIENT_SECRET);

		const res = await fetch(`${env.TEST_BASE_URL}/v1/apis.addScope`, {
			method: 'POST',
			body: JSON.stringify({
				apiId: env.API_ID,
				scope: {
					name: 'test-scope',
					description: 'test-scope-description',
				},
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});
		const resJson = await res.json();

		expect(res.status).toBe(403);
		expect(resJson).toHaveProperty('reason');
		expect((resJson as any).reason).toBe('FORBIDDEN');
		expect(resJson).toHaveProperty('message');
	});

	it('should respond with 404 NOT_FOUND if token does not have access to api', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.OTHER_ROOT_CLIENT_ID, env.OTHER_ROOT_CLIENT_SECRET);

		const res = await fetch(`${env.TEST_BASE_URL}/v1/apis.addScope`, {
			method: 'POST',
			body: JSON.stringify({
				apiId: env.API_ID,
				scope: {
					name: 'test-scope',
					description: 'test-scope-description',
				},
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

	it('should respond with 409 CONFLICT if scope aleady exists', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const res = await fetch(`${env.TEST_BASE_URL}/v1/apis.addScope`, {
			method: 'POST',
			body: JSON.stringify({
				apiId: env.API_ID,
				scope: {
					name: 'example-scope', // inside bootstrap the apis are created with a scope named 'example-scope'
					description: 'test-scope-description',
				},
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});
		const resJson = await res.json();

		expect(res.status).toBe(409);
		expect(resJson).toHaveProperty('reason');
		expect((resJson as any).reason).toBe('CONFLICT');
		expect(resJson).toHaveProperty('message');
	});

	it('should respond with 200 OK and create api scope', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const res = await fetch(`${env.TEST_BASE_URL}/v1/apis.addScope`, {
			method: 'POST',
			body: JSON.stringify({
				apiId: env.API_ID,
				scope: {
					name: 'new-scope',
					description: 'new-scope-description',
				},
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});
		const resJson = await res.json();

		expect(res.status).toBe(200);
		expect(resJson).toHaveProperty('id');
	});
});
