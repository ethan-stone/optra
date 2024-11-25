import { describe, it, expect, beforeAll } from 'vitest';
import { testEnvSchema } from './test-env-schema';
import { createApi, getOAuthToken } from './helpers';

const env = testEnvSchema.parse(process.env);

describe('POST /v1/apis.getApi', () => {
	let apiId: string;

	beforeAll(async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const api = await createApi(env.TEST_BASE_URL, token, {
			algorithm: 'hsa256',
		});

		apiId = api.id;
	});

	it('should respond with 400 BAD_REQUEST if invalid query params', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		// missing query string param
		const res = await fetch(`${env.TEST_BASE_URL}/v1/apis.getApi`, {
			method: 'GET',
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

		const url = new URL(`${env.TEST_BASE_URL}/v1/apis.getApi`);
		url.searchParams.set('apiId', 'does-not-exist');

		const res = await fetch(url, {
			method: 'GET',
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

	it('should respond with 403 FORBIDDEN if not root client', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.BASIC_CLIENT_ID, env.BASIC_CLIENT_SECRET);

		const url = new URL(`${env.TEST_BASE_URL}/v1/apis.getApi`);
		url.searchParams.set('apiId', apiId);

		const res = await fetch(url, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});
		const resJson = await res.json();

		expect(res.status).toBe(403);
		expect(resJson).toHaveProperty('reason');
		expect(resJson).toHaveProperty('message');
		expect((resJson as any).reason).toBe('FORBIDDEN');
	});

	it('should respond with 404 NOT_FOUND api does not belong to client making request', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.OTHER_ROOT_CLIENT_ID, env.OTHER_ROOT_CLIENT_SECRET);

		const url = new URL(`${env.TEST_BASE_URL}/v1/apis.getApi`);
		url.searchParams.set('apiId', apiId);

		const res = await fetch(url, {
			method: 'GET',
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

	it('should respond with 200 OK with api', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const url = new URL(`${env.TEST_BASE_URL}/v1/apis.getApi`);
		url.searchParams.set('apiId', apiId);

		const res = await fetch(url, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});
		const resJson = await res.json();

		expect(res.status).toBe(200);
		expect((resJson as any).id).toEqual(apiId);
	});
});
