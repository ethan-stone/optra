import { describe, it, expect } from 'vitest';
import { testEnvSchema } from './test-env-schema';
import { JwtPayload, sign } from '@/crypto-utils';
import { getOAuthToken } from './helpers';

const env = testEnvSchema.parse(process.env);

describe('POST /v1/clients.rotateSecret', () => {
	it('should respond with 400 BAD_REQUEST if invalid body', async () => {
		const req = new Request(`${env.BASE_URL}/v1/clients.rotateSecret`, {
			method: 'POST',
			body: JSON.stringify({}), // missing fields
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const res = await fetch(req);
		const resJson = await res.json();

		expect(res.status).toBe(400);
		expect(resJson).toHaveProperty('reason');
		expect(resJson).toHaveProperty('message');
		expect((resJson as any).reason).toBe('BAD_REQUEST');
	});

	it('should respond with 200 OK using root client', async () => {
		const token = await getOAuthToken(env.BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const getClientReq = new Request(`${env.BASE_URL}/v1/clients.getClient?clientId=${env.BASIC_CLIENT_ID}`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		const clientBefore = await (await fetch(getClientReq)).json();

		const req = new Request(`${env.BASE_URL}/v1/clients.rotateSecret`, {
			method: 'POST',
			body: JSON.stringify({
				clientId: env.BASIC_CLIENT_ID,
				expiresIn: 1000 * 60 * 60 * 24 * 7, // 7 days from now
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		const res = await fetch(req);
		const resJson = await res.json();

		const clientAfter = await (await fetch(getClientReq)).json();

		expect(res.status).toBe(200);
		expect(resJson).toHaveProperty('id');
		expect(resJson).toHaveProperty('secret');
		expect((clientAfter as any).version).toBe((clientBefore as any).version + 1);
	});
});
