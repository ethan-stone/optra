import { describe, it, expect } from 'vitest';
import { testEnv } from './test-env';
import { getOAuthToken } from './helpers';

const env = testEnv.parse(process.env);

describe('POST /v1/clients.createClient', () => {
	it('should respond with 400 BAD_REQUEST if invalid body', async () => {
		const token = await getOAuthToken(env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

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

	it('should response with 401 BAD_JWT if authorization header missing', async () => {
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

	it('should response with 403 FORBIDDEN if not root client', async () => {
		const token = await getOAuthToken(env.BASIC_CLIENT_ID, env.BASIC_CLIENT_SECRET);

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

	it('should response with 400 BAD_REQUEST if api does not exist', async () => {
		const token = await getOAuthToken(env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

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

	it('should response with 400 BAD_REQUEST if api does not exist because root client does not have access to workspace', async () => {
		const token = await getOAuthToken(env.OTHER_ROOT_CLIENT_ID, env.OTHER_ROOT_CLIENT_SECRET);

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

	it('should response with 200 OK if valid request', async () => {
		const token = await getOAuthToken(env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

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

		expect(res.status).toBe(200);
		expect(resJson).toHaveProperty('clientId');
		expect(resJson).toHaveProperty('clientSecret');
	});
});
