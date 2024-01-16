import { describe, it, expect, beforeAll } from 'vitest';
import { testEnvSchema } from './test-env-schema';
import { createClient, getOAuthToken } from './helpers';

const env = testEnvSchema.parse(process.env);

describe('POST /v1/clients.deleteClient', () => {
	let clientId: string;

	beforeAll(async () => {
		const token = await getOAuthToken(env.BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const client = await createClient(env.BASE_URL, token, {
			apiId: env.API_ID,
		});

		clientId = client.clientId;
	});

	it('should respond with 400 BAD_REQUEST if invalid body', async () => {
		const token = await getOAuthToken(env.BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.BASE_URL}/v1/clients.deleteClient`, {
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

	it('should respond with 404 NOT_FOUND if client does not exist because it actually does not exist', async () => {
		const token = await getOAuthToken(env.BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.BASE_URL}/v1/clients.deleteClient`, {
			method: 'POST',
			body: JSON.stringify({
				id: 'does-not-exist',
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
		expect(resJson).toHaveProperty('message');
		expect((resJson as any).reason).toBe('NOT_FOUND');
	});

	it('should respond with 404 NOT_FOUND if client does not exist because client does not have access', async () => {
		const token = await getOAuthToken(env.BASE_URL, env.OTHER_ROOT_CLIENT_ID, env.OTHER_ROOT_CLIENT_SECRET);

		const req = new Request(`${env.BASE_URL}/v1/clients.deleteClient`, {
			method: 'POST',
			body: JSON.stringify({
				id: clientId,
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
		expect(resJson).toHaveProperty('message');
		expect((resJson as any).reason).toBe('NOT_FOUND');
	});

	it('should respond with 200 OK if successfully deleted', async () => {
		const token = await getOAuthToken(env.BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.BASE_URL}/v1/clients.deleteClient`, {
			method: 'POST',
			body: JSON.stringify({
				id: clientId,
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
