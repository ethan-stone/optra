import { describe, it, expect, beforeAll } from 'vitest';
import { testEnvSchema } from './test-env-schema';
import { createApi, getOAuthToken } from './helpers';

const env = testEnvSchema.parse(process.env);

describe('POST /v1/apis.deleteApi', () => {
	let apiId: string;

	beforeAll(async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const api = await createApi(env.TEST_BASE_URL, token, {
			algorithm: 'hsa256',
		});

		apiId = api.id;
	});

	it('should respond with 400 BAD_REQUEST if invalid body', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const res = await fetch(`${env.TEST_BASE_URL}/v1/apis.deleteApi`, {
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
		expect(resJson).toHaveProperty('message');
		expect((resJson as any).reason).toBe('BAD_REQUEST');
	});

	it('should respond with 404 NOT_FOUND if api does not exist because it actually does not exist', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const res = await fetch(`${env.TEST_BASE_URL}/v1/apis.deleteApi`, {
			method: 'POST',
			body: JSON.stringify({
				id: 'does-not-exist',
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});
		const resJson = await res.json();

		expect(res.status).toBe(404);
		expect(resJson).toHaveProperty('reason');
		expect(resJson).toHaveProperty('message');
		expect((resJson as any).reason).toBe('NOT_FOUND');
	});

	it('should respond with 404 NOT_FOUND if api does not exist because client does not have access', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.OTHER_ROOT_CLIENT_ID, env.OTHER_ROOT_CLIENT_SECRET);

		const res = await fetch(`${env.TEST_BASE_URL}/v1/apis.deleteApi`, {
			method: 'POST',
			body: JSON.stringify({
				id: apiId,
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});
		const resJson = await res.json();

		expect(res.status).toBe(404);
		expect(resJson).toHaveProperty('reason');
		expect(resJson).toHaveProperty('message');
		expect((resJson as any).reason).toBe('NOT_FOUND');
	});

	it('should respond with 200 OK if successfully deleted', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const res = await fetch(`${env.TEST_BASE_URL}/v1/apis.deleteApi`, {
			method: 'POST',
			body: JSON.stringify({
				id: apiId,
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		expect(res.status).toBe(200);
	});
});
