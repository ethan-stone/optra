import { describe, expect, it } from 'vitest';
import { testEnvSchema } from './test-env-schema';
import { getOAuthToken } from './helpers';

const env = testEnvSchema.parse(process.env);

describe('POST /v1/apis.removeScope', () => {
	it('should respond with 400 BAD_REQUEST if invalid body', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.TEST_BASE_URL}/v1/apis.removeScope`, {
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
		expect(resJson).toHaveProperty('reason');
		expect((resJson as any).reason).toBe('BAD_REQUEST');
		expect(resJson).toHaveProperty('message');
	});

	it('should respond with 404 NOT_FOUND if api does not exist', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.TEST_BASE_URL}/v1/apis.removeScope`, {
			method: 'POST',
			body: JSON.stringify({
				apiId: 'non-existent-api-id',
				scopeName: 'non-existent-scope-id',
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		const res = await fetch(req);
		const resJson = await res.json();

		expect(res.status).toBe(404);
		expect(resJson).toHaveProperty('reason');
		expect((resJson as any).reason).toBe('NOT_FOUND');
		expect(resJson).toHaveProperty('message');
	});

	it('should respond with 404 NOT_FOUND if token does not have access to api', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.BASIC_CLIENT_ID, env.BASIC_CLIENT_SECRET);

		const req = new Request(`${env.TEST_BASE_URL}/v1/apis.removeScope`, {
			method: 'POST',
			body: JSON.stringify({
				apiId: env.API_ID,
				scopeName: 'non-existent-scope-id',
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		const res = await fetch(req);
		const resJson = await res.json();

		expect(res.status).toBe(404);
		expect(resJson).toHaveProperty('reason');
		expect((resJson as any).reason).toBe('NOT_FOUND');
		expect(resJson).toHaveProperty('message');
	});

	it('should respond with 200 OK if scope does not exist', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.TEST_BASE_URL}/v1/apis.removeScope`, {
			method: 'POST',
			body: JSON.stringify({
				apiId: env.API_ID,
				scopeName: 'does-not-exist',
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		const res = await fetch(req);

		expect(res.status).toBe(200);
	});

	it('should respond with 200 OK if scope does not exist', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.TEST_BASE_URL}/v1/apis.removeScope`, {
			method: 'POST',
			body: JSON.stringify({
				apiId: env.API_ID,
				scopeName: 'does-not-exist',
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		const res = await fetch(req);

		expect(res.status).toBe(200);
	});

	it('should respond with 200 OK if scope exists and is deleted', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		// add a new scope before handle to not conflict with other tests
		const addScopeReq = new Request(`${env.TEST_BASE_URL}/v1/apis.addScope`, {
			method: 'POST',
			body: JSON.stringify({
				apiId: env.API_ID,
				scope: {
					name: 'another-scope',
					description: 'new-scope-description',
				},
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		await fetch(addScopeReq);

		const req = new Request(`${env.TEST_BASE_URL}/v1/apis.removeScope`, {
			method: 'POST',
			body: JSON.stringify({
				apiId: env.API_ID,
				scopeName: 'another-scope', // inside bootstrap the apis are created with a scope named 'example-scope'
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		const res = await fetch(req);

		expect(res.status).toBe(200);
	});
});
