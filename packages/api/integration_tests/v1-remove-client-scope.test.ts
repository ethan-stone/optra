import { describe, expect, it } from 'vitest';
import { testEnvSchema } from './test-env-schema';
import { generateRandomName, getOAuthToken } from './helpers';

const env = testEnvSchema.parse(process.env);

describe('POST /v1/clients.removeScope', () => {
	it('should respond with 400 BAD_REQUEST if invalid body', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.TEST_BASE_URL}/v1/clients.removeScope`, {
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

	it('should respond with 404 NOT_FOUND if client does not exist', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.TEST_BASE_URL}/v1/clients.removeScope`, {
			method: 'POST',
			body: JSON.stringify({
				clientId: 'non-existent-client-id',
				scopeName: 'non-existent-scope-id',
			}), // missing fields
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

		const req = new Request(`${env.TEST_BASE_URL}/v1/clients.removeScope`, {
			method: 'POST',
			body: JSON.stringify({
				clientId: env.BASIC_CLIENT_ID,
				scopeName: 'non-existent-scope-id',
			}), // missing fields
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		const res = await fetch(req);

		expect(res.status).toBe(200);
	});

	it('should respond with 200 OK if scope is successfully removed', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const newScope = generateRandomName();

		const addApiScope = new Request(`${env.TEST_BASE_URL}/v1/apis.addScope`, {
			method: 'POST',
			body: JSON.stringify({
				apiId: env.API_ID,
				scopeName: newScope,
			}), // missing fields
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		await fetch(addApiScope);

		const addClientScope = new Request(`${env.TEST_BASE_URL}/v1/clients.addScope`, {
			method: 'POST',
			body: JSON.stringify({
				clientId: env.BASIC_CLIENT_ID,
				scopeName: newScope,
			}), // missing fields
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		await fetch(addClientScope);

		const req = new Request(`${env.TEST_BASE_URL}/v1/clients.removeScope`, {
			method: 'POST',
			body: JSON.stringify({
				clientId: env.BASIC_CLIENT_ID,
				scopeName: newScope,
			}), // missing fields
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		const res = await fetch(req);

		expect(res.status).toBe(200);
	});
});
