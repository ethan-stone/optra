import { describe, it, expect } from 'vitest';
import { testEnvSchema } from './test-env-schema';
import { getOAuthToken } from './helpers';

const env = testEnvSchema.parse(process.env);

describe('POST /v1/clients.rotateSecret', () => {
	it('should respond with 400 BAD_REQUEST if invalid body', async () => {
		const res = await fetch(`${env.TEST_BASE_URL}/v1/clients.rotateSecret`, {
			method: 'POST',
			body: JSON.stringify({}), // missing fields
			headers: {
				'Content-Type': 'application/json',
			},
		});
		const resJson = await res.json();

		expect(res.status).toBe(400);
		expect(resJson).toHaveProperty('reason');
		expect(resJson).toHaveProperty('message');
		expect((resJson as any).reason).toBe('BAD_REQUEST');
	});

	it('should respond with 200 OK using root client', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const clientBefore = await (
			await fetch(`${env.TEST_BASE_URL}/v1/clients.getClient?clientId=${env.BASIC_CLIENT_ID_FOR_ROTATING}`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})
		).json();

		const res = await fetch(`${env.TEST_BASE_URL}/v1/clients.rotateSecret`, {
			method: 'POST',
			body: JSON.stringify({
				clientId: env.BASIC_CLIENT_ID_FOR_ROTATING,
				expiresIn: 1000 * 60, // 1 minute
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});
		const resJson = await res.json();

		const clientAfter = await (
			await fetch(`${env.TEST_BASE_URL}/v1/clients.getClient?clientId=${env.BASIC_CLIENT_ID_FOR_ROTATING}`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})
		).json();

		expect(res.status).toBe(200);
		expect(resJson).toHaveProperty('id');
		expect(resJson).toHaveProperty('secret');
		expect((clientAfter as any).version).toBe((clientBefore as any).version + 1);
	});
});
