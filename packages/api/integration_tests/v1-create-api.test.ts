import { describe, expect, it } from 'vitest';
import { testEnvSchema } from './test-env-schema';
import { generateRandomName, getOAuthToken } from './helpers';

const env = testEnvSchema.parse(process.env);

describe('POST /v1/apis.createApi', () => {
	it('should respond with 400 BAD_REQUEST if invalid body', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.TEST_BASE_URL}/v1/apis.createApi`, {
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

	it('should respond with 401 BAD_JWT if authorization header missing', async () => {
		const req = new Request(`${env.TEST_BASE_URL}/v1/apis.createApi`, {
			method: 'POST',
			body: JSON.stringify({
				name: 'test',
				scopes: [],
				algorithm: 'hsa256',
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

	it('should respond with 403 FORBIDDEN if not authorized', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.BASIC_CLIENT_ID, env.BASIC_CLIENT_SECRET);

		const req = new Request(`${env.TEST_BASE_URL}/v1/apis.createApi`, {
			method: 'POST',
			body: JSON.stringify({
				name: generateRandomName(),
				scopes: [],
				algorithm: 'hsa256',
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

	it('should respond with 409 CONFLICT if api with name already exists', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const name = generateRandomName();

		const req1 = new Request(`${env.TEST_BASE_URL}/v1/apis.createApi`, {
			method: 'POST',
			body: JSON.stringify({
				name,
				scopes: [
					{
						name: 'test',
						description: 'this is a test api scope',
					},
				],
				algorithm: 'hsa256',
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		// first request should succeed
		const res1 = await fetch(req1);
		const res1Json = await res1.json();

		expect(res1.status).toBe(200);
		expect(res1Json).toHaveProperty('id');

		const req2 = new Request(`${env.TEST_BASE_URL}/v1/apis.createApi`, {
			method: 'POST',
			body: JSON.stringify({
				name,
				scopes: [
					{
						name: 'test',
						description: 'this is a test api scope',
					},
				],
				algorithm: 'hsa256',
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		// second request should fail
		const res2 = await fetch(req2);
		const res2Json = await res2.json();

		expect(res2.status).toBe(409);
		expect(res2Json).toHaveProperty('reason');
		expect((res2Json as any).reason).toBe('CONFLICT');
		expect(res2Json).toHaveProperty('message');
	});

	it('should respond with 200 OK and create an api with hsa256', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.TEST_BASE_URL}/v1/apis.createApi`, {
			method: 'POST',
			body: JSON.stringify({
				name: generateRandomName(),
				scopes: [
					{
						name: 'test',
						description: 'this is a test api scope',
					},
				],
				algorithm: 'hsa256',
				tokenExpirationInSeconds: 84600,
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

	it('should respond with 200 OK and create an api with rsa256', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.TEST_BASE_URL}/v1/apis.createApi`, {
			method: 'POST',
			body: JSON.stringify({
				name: generateRandomName(),
				scopes: [
					{
						name: 'test',
						description: 'this is a test api scope',
					},
				],
				algorithm: 'rsa256',
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
