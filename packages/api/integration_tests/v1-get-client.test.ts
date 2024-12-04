import { describe, it, expect } from 'vitest';
import { testEnvSchema } from './test-env-schema';
import { getOAuthToken } from './helpers';

const env = testEnvSchema.parse(process.env);

describe('GET /v1/clients.getClient', () => {
	it('should respond with 400 BAD_REQUEST if invalid query params', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const res = await fetch(`${env.TEST_BASE_URL}/v1/clients.getClient`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});
		const resJson = await res.json();

		expect(res.status).toBe(400);
		expect(resJson).toHaveProperty('reason');
		expect(resJson).toHaveProperty('message');
		expect((resJson as any).reason).toBe('BAD_REQUEST');
	});

	it('should respond with 404 NOT_FOUND if client does not exist', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const res = await fetch(`${env.TEST_BASE_URL}/v1/clients.getClient?clientId=${'fake client'}`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});
		const resJson = await res.json();

		expect(res.status).toBe(404);
		expect(resJson).toHaveProperty('reason');
		expect(resJson).toHaveProperty('message');
		expect((resJson as any).reason).toBe('NOT_FOUND');
	});

	it('should respond with 404 NOT_FOUND if client does not belong to root client workspace', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.OTHER_ROOT_CLIENT_ID, env.OTHER_ROOT_CLIENT_SECRET);

		const res = await fetch(`${env.TEST_BASE_URL}/v1/clients.getClient?clientId=${env.BASIC_CLIENT_ID}`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});
		const resJson = await res.json();

		expect(res.status).toBe(404);
		expect(resJson).toHaveProperty('reason');
		expect(resJson).toHaveProperty('message');
		expect((resJson as any).reason).toBe('NOT_FOUND');
	});

	it('should respond with 403 FORBIDDEN if request made with basic client', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.BASIC_CLIENT_ID, env.BASIC_CLIENT_SECRET);

		const res = await fetch(`${env.TEST_BASE_URL}/v1/clients.getClient?clientId=${env.BASIC_CLIENT_ID}`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		const resJson = await res.json();

		expect(res.status).toBe(403);
		expect(resJson).toHaveProperty('reason');
		expect(resJson).toHaveProperty('message');
		expect((resJson as any).reason).toBe('FORBIDDEN');
	});

	it('should respond with 200 OK if client is found', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const res = await fetch(`${env.TEST_BASE_URL}/v1/clients.getClient?clientId=${env.BASIC_CLIENT_ID}`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});
		const resJson = await res.json();

		expect(res.status).toBe(200);
		expect(resJson).toHaveProperty('id');
		expect((resJson as any).id).toBe(env.BASIC_CLIENT_ID);
	});
});
