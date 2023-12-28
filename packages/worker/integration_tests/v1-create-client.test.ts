import { describe, it, expect } from 'vitest';
import { testEnvSchema } from './test-env-schema';
import { generateJsonObject, getOAuthToken } from './helpers';

const env = testEnvSchema.parse(process.env);

describe('POST /v1/clients.createClient', () => {
	it('should respond with 400 BAD_REQUEST if invalid body', async () => {
		const token = await getOAuthToken(env.BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.BASE_URL}/v1/clients.createClient`, {
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
		expect(resJson).toHaveProperty('message');
		expect((resJson as any).reason).toBe('BAD_REQUEST');
	});

	it('should respond with 400 BAD_REQUEST if metadata too large', async () => {
		const token = await getOAuthToken(env.BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.BASE_URL}/v1/clients.createClient`, {
			method: 'POST',
			body: JSON.stringify({
				name: 'test',
				apiId: env.API_ID,
				metadata: generateJsonObject(1000), // 1000 keys should be larger than 1KB
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		const res = await fetch(req);
		const resJson = await res.json();

		expect(res.status).toBe(400);
		expect(resJson).toHaveProperty('reason');
		expect(resJson).toHaveProperty('message');
		expect((resJson as any).reason).toBe('BAD_REQUEST');
	});

	it('should respond with 400 BAD_REQUEST if metadata key values are not just number, string, and boolean', async () => {
		const token = await getOAuthToken(env.BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.BASE_URL}/v1/clients.createClient`, {
			method: 'POST',
			body: JSON.stringify({
				name: 'test',
				apiId: env.API_ID,
				metadata: {
					key: {
						nested: 'value',
					},
				}, // nested objects are not valid
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		const res = await fetch(req);
		const resJson = await res.json();

		expect(res.status).toBe(400);
		expect(resJson).toHaveProperty('reason');
		expect(resJson).toHaveProperty('message');
		expect((resJson as any).reason).toBe('BAD_REQUEST');
	});

	it('should respond with 401 BAD_JWT if authorization header missing', async () => {
		const req = new Request(`${env.BASE_URL}/v1/clients.createClient`, {
			method: 'POST',
			body: JSON.stringify({
				name: 'test',
				apiId: env.API_ID,
			}),
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const res = await fetch(req);
		const resJson = await res.json();

		expect(res.status).toBe(401);
		expect(resJson).toHaveProperty('reason');
		expect((resJson as any).reason).toBe('BAD_JWT');
		expect(resJson).toHaveProperty('message');
	});

	it('should respond with 403 FORBIDDEN if not root client', async () => {
		const token = await getOAuthToken(env.BASE_URL, env.BASIC_CLIENT_ID, env.BASIC_CLIENT_SECRET);

		const req = new Request(`${env.BASE_URL}/v1/clients.createClient`, {
			method: 'POST',
			body: JSON.stringify({
				name: 'test',
				apiId: env.API_ID,
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		const res = await fetch(req);
		const resJson = await res.json();

		expect(res.status).toBe(403);
		expect(resJson).toHaveProperty('reason');
		expect((resJson as any).reason).toBe('FORBIDDEN');
		expect(resJson).toHaveProperty('message');
	});

	it('should respond with 400 BAD_REQUEST if api does not exist', async () => {
		const token = await getOAuthToken(env.BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.BASE_URL}/v1/clients.createClient`, {
			method: 'POST',
			body: JSON.stringify({
				name: 'test',
				apiId: 'fake api',
			}),
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

	it('should respond with 400 BAD_REQUEST if api does not exist because root client does not have access to workspace', async () => {
		const token = await getOAuthToken(env.BASE_URL, env.OTHER_ROOT_CLIENT_ID, env.OTHER_ROOT_CLIENT_SECRET);

		const req = new Request(`${env.BASE_URL}/v1/clients.createClient`, {
			method: 'POST',
			body: JSON.stringify({
				name: 'test',
				apiId: env.API_ID,
			}),
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

	it('should respond with 200 OK if valid request', async () => {
		const token = await getOAuthToken(env.BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.BASE_URL}/v1/clients.createClient`, {
			method: 'POST',
			body: JSON.stringify({
				name: 'test',
				apiId: env.API_ID,
				metadata: generateJsonObject(10), // 10 keys should be less than 1KB
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		const res = await fetch(req);
		const resJson = await res.json();

		console.log((resJson as any).clientId);

		expect(res.status).toBe(200);
		expect(resJson).toHaveProperty('clientId');
		expect(resJson).toHaveProperty('clientSecret');
	});
});
