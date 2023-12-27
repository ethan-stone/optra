import { describe, it, expect } from 'vitest';
import { testEnv } from './test-env';
import { JwtPayload, sign } from '@/crypto-utils';
import { getOAuthToken } from './helpers';

const env = testEnv.parse(process.env);

describe('POST /v1/tokens.verifyToken', () => {
	it('should respond with 400 BAD_REQUEST if invalid body', async () => {
		const req = new Request(`${env.BASE_URL}/v1/tokens.verifyToken`, {
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

	it('should return 200 OK with invalid if token is expired', async () => {
		const token = await sign(
			{
				exp: new Date().getTime() / 1000 - 1000,
				iat: new Date().getTime() / 1000,
				sub: env.BASIC_CLIENT_ID,
				version: 1,
				secret_expires_at: null,
			},
			env.JWT_SECRET
		);

		const req = new Request(`${env.BASE_URL}/v1/tokens.verifyToken`, {
			method: 'POST',
			body: JSON.stringify({
				token,
			}),
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const res = await fetch(req);
		const resJson = await res.json();

		expect(res.status).toBe(200);
		expect(resJson).toHaveProperty('valid');
		expect((resJson as any).valid).toBeFalsy();
		expect(resJson).toHaveProperty('reason');
		expect((resJson as any).reason).toBe('EXPIRED');
	});

	it('should return 200 OK with invalid if token is of an invalid format', async () => {
		const req = new Request(`${env.BASE_URL}/v1/tokens.verifyToken`, {
			method: 'POST',
			body: JSON.stringify({
				token: 'invalid',
			}),
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const res = await fetch(req);
		const resJson = await res.json();

		expect(res.status).toBe(200);
		expect(resJson).toHaveProperty('valid');
		expect((resJson as any).valid).toBeFalsy();
		expect(resJson).toHaveProperty('reason');
		expect((resJson as any).reason).toBe('BAD_JWT');
	});

	it('should return 200 OK with invalid if token has invalid signature', async () => {
		const token = await sign(
			{
				exp: new Date().getTime() / 1000 + 60 * 60 * 24,
				iat: new Date().getTime() / 1000,
				sub: env.BASIC_CLIENT_ID,
				version: 1,
				secret_expires_at: null,
			},
			env.JWT_SECRET
		);

		const req = new Request(`${env.BASE_URL}/v1/tokens.verifyToken`, {
			method: 'POST',
			body: JSON.stringify({
				token: token + 'somerandomtexttomakeitinvalid',
			}),
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const res = await fetch(req);
		const resJson = await res.json();

		expect(res.status).toBe(200);
		expect(resJson).toHaveProperty('valid');
		expect((resJson as any).valid).toBeFalsy();
		expect(resJson).toHaveProperty('reason');
		expect((resJson as any).reason).toBe('INVALID_SIGNATURE');
	});

	// not sure we really have to cover this. The sign function fails if you don't provide an object for the payloasd
	it.todo('should return 200 OK with invalid if signature somehow valid but payload can not be parsed', async () => {
		const token = await sign(null as unknown as JwtPayload, env.JWT_SECRET);

		const req = new Request(`${env.BASE_URL}/v1/tokens.verifyToken`, {
			method: 'POST',
			body: JSON.stringify({
				token,
			}),
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const res = await fetch(req);
		const resJson = await res.json();

		expect(res.status).toBe(200);
		expect(resJson).toHaveProperty('valid');
		expect((resJson as any).valid).toBeFalsy();
		expect(resJson).toHaveProperty('reason');
		expect((resJson as any).reason).toBe('INVALID_SIGNATURE');
	});

	it('should return 200 OK with invalid if client does not exist', async () => {
		const token = await sign(
			{
				exp: new Date().getTime() / 1000 + 60 * 60 * 24,
				iat: new Date().getTime() / 1000,
				sub: 'fakeclient',
				version: 1,
				secret_expires_at: null,
			},
			env.JWT_SECRET
		);

		const req = new Request(`${env.BASE_URL}/v1/tokens.verifyToken`, {
			method: 'POST',
			body: JSON.stringify({
				token,
			}),
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const res = await fetch(req);
		const resJson = await res.json();

		expect(res.status).toBe(200);
		expect(resJson).toHaveProperty('valid');
		expect((resJson as any).valid).toBeFalsy();
		expect(resJson).toHaveProperty('reason');
		expect((resJson as any).reason).toBe('INVALID_CLIENT');
	});

	it('should return 200 OK with invalid if ratelimit exceeded', async () => {
		const token = await getOAuthToken(env.BASIC_CLIENT_ID_WITH_LOW_RATELIMIT, env.BASIC_CLIENT_SECRET_WITH_LOW_RATELIMIT);

		while (true) {
			const req = new Request(`${env.BASE_URL}/v1/tokens.verifyToken`, {
				method: 'POST',
				body: JSON.stringify({
					token,
				}),
				headers: {
					'Content-Type': 'application/json',
				},
			});

			const res = await fetch(req);
			const resJson = await res.json();

			expect(res.status).toBe(200);
			expect(resJson).toHaveProperty('valid');

			if (!(resJson as any).valid) {
				expect((resJson as any).valid).toBeFalsy();
				expect(resJson).toHaveProperty('reason');
				expect((resJson as any).reason).toBe('RATELIMIT_EXCEEDED');
				break;
			}
		}
	});

	it('should return 200 OK with valid if token is valid', async () => {
		const token = await getOAuthToken(env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.BASE_URL}/v1/tokens.verifyToken`, {
			method: 'POST',
			body: JSON.stringify({
				token,
			}),
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const res = await fetch(req);
		const resJson = await res.json();

		expect(res.status).toBe(200);
		expect(resJson).toHaveProperty('valid');
		expect((resJson as any).valid).toBeTruthy();
	});
});
