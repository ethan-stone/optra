import { describe, expect, it } from 'vitest';
import { testEnv } from './test-env';
import { getOAuthToken } from './helpers';

const env = testEnv.parse(process.env);

describe('POST /v1/apis.createApi', () => {
	it('should reject if invalid body', async () => {
		const token = await getOAuthToken(env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.BASE_URL}/v1/apis.createApi`, {
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

	it('should return 401 BAD_JWT if authorization header missing', async () => {
		const req = new Request(`${env.BASE_URL}/v1/apis.createApi`, {
			method: 'POST',
			body: JSON.stringify({
				name: 'test',
				scopes: [],
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

	it.todo('should return 403 FORBIDDEN if not authorized', async () => {
		const token = await getOAuthToken(env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.BASE_URL}/v1/apis.createApi`, {
			method: 'POST',
			body: JSON.stringify({
				name: 'test',
				scopes: [],
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

	it('should successfully create an api', async () => {
		const token = await getOAuthToken(env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.BASE_URL}/v1/apis.createApi`, {
			method: 'POST',
			body: JSON.stringify({
				name: 'test',
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		const res = await fetch(req);
		const resJson = await res.json();

		expect(res.status).toBe(200);
		expect(resJson).toHaveProperty('id');
	});
});
