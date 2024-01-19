import { describe, it, expect } from 'vitest';
import { testEnvSchema } from './test-env-schema';
import { JwtPayload, sign } from '@/crypto-utils';
import { generateRandomName, getOAuthToken } from './helpers';

const env = testEnvSchema.parse(process.env);

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

	it('should respond with 200 OK with invalid if token is expired', async () => {
		const token = await sign(
			{
				exp: new Date().getTime() / 1000 - 1000,
				iat: new Date().getTime() / 1000,
				sub: env.BASIC_CLIENT_ID,
				version: 1,
				secret_expires_at: null,
			},
			'wefwf',
			{
				algorithm: 'HS256',
				header: {
					kid: 'wefwef',
					typ: 'JWT',
				},
			}
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

	it('should respond with 200 OK with invalid if token is of an invalid format', async () => {
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

	it('should respond with 200 OK with invalid if token has invalid signature', async () => {
		const token = await sign(
			{
				exp: new Date().getTime() / 1000 + 60 * 60 * 24,
				iat: new Date().getTime() / 1000,
				sub: env.BASIC_CLIENT_ID,
				version: 1,
				secret_expires_at: null,
			},
			'wefwe',
			{
				algorithm: 'HS256',
				header: {
					kid: 'wefwef',
					typ: 'JWT',
				},
			}
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

	// not sure we really have to cover this. The sign function fails if you don't provide an object for the payload
	it.todo('should respond with 200 OK with invalid if signature somehow valid but payload can not be parsed', async () => {
		// const token = await sign(null as unknown as JwtPayload, 'wef');
		// const req = new Request(`${env.BASE_URL}/v1/tokens.verifyToken`, {
		// 	method: 'POST',
		// 	body: JSON.stringify({
		// 		token,
		// 	}),
		// 	headers: {
		// 		'Content-Type': 'application/json',
		// 	},
		// });
		// const res = await fetch(req);
		// const resJson = await res.json();
		// expect(res.status).toBe(200);
		// expect(resJson).toHaveProperty('valid');
		// expect((resJson as any).valid).toBeFalsy();
		// expect(resJson).toHaveProperty('reason');
		// expect((resJson as any).reason).toBe('INVALID_SIGNATURE');
	});

	it('should respond with 200 OK with invalid if client does not exist', async () => {
		const token = await sign(
			{
				exp: new Date().getTime() / 1000 + 60 * 60 * 24,
				iat: new Date().getTime() / 1000,
				sub: 'fakeclient',
				version: 1,
				secret_expires_at: null,
			},
			'wefwef',
			{
				algorithm: 'HS256',
				header: {
					kid: 'wefwef',
					typ: 'JWT',
				},
			}
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

	it('should respond with 200 OK with invalid if ratelimit exceeded', async () => {
		const token = await getOAuthToken(env.BASE_URL, env.BASIC_CLIENT_ID_WITH_LOW_RATELIMIT, env.BASIC_CLIENT_SECRET_WITH_LOW_RATELIMIT);

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

	it.todo('should respond with 200 OK with invalid if version mismatch', async () => {});

	it('should respond with 200 OK with invalid if token is missing scopes', async () => {
		const createClientToken = await getOAuthToken(env.BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const createClient = new Request(`${env.BASE_URL}/v1/clients.createClient`, {
			method: 'POST',
			body: JSON.stringify({
				name: generateRandomName(),
				apiId: env.API_ID,
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${createClientToken}`,
			},
		});

		const newClient = await fetch(createClient);
		const client = (await newClient.json()) as { clientId: string; clientSecret: string };

		const token = await getOAuthToken(env.BASE_URL, client.clientId, client.clientSecret);

		const req = new Request(`${env.BASE_URL}/v1/tokens.verifyToken`, {
			method: 'POST',
			body: JSON.stringify({
				token,
				requiredScopes: {
					method: 'all',
					names: ['example-scope'],
				},
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
		expect((resJson as any).reason).toBe('MISSING_SCOPES');
	});

	it('should respond with 200 OK with valid if token has all required scopes', async () => {
		const createClientToken = await getOAuthToken(env.BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const createClient = new Request(`${env.BASE_URL}/v1/clients.createClient`, {
			method: 'POST',
			body: JSON.stringify({
				name: generateRandomName(),
				apiId: env.API_ID,
				scopes: ['example-scope', 'another-example-scope'],
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${createClientToken}`,
			},
		});

		const newClient = await fetch(createClient);
		const client = (await newClient.json()) as { clientId: string; clientSecret: string };

		const token = await getOAuthToken(env.BASE_URL, client.clientId, client.clientSecret);

		const req = new Request(`${env.BASE_URL}/v1/tokens.verifyToken`, {
			method: 'POST',
			body: JSON.stringify({
				token,
				requiredScopes: {
					method: 'all',
					names: ['example-scope', 'another-example-scope'],
				},
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

	it('should respond with 200 OK with valid if token has one of required scopes', async () => {
		const createClientToken = await getOAuthToken(env.BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const createClient = new Request(`${env.BASE_URL}/v1/clients.createClient`, {
			method: 'POST',
			body: JSON.stringify({
				name: generateRandomName(),
				apiId: env.API_ID,
				scopes: ['example-scope'],
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${createClientToken}`,
			},
		});

		const newClient = await fetch(createClient);
		const client = (await newClient.json()) as { clientId: string; clientSecret: string };

		const token = await getOAuthToken(env.BASE_URL, client.clientId, client.clientSecret);

		const req = new Request(`${env.BASE_URL}/v1/tokens.verifyToken`, {
			method: 'POST',
			body: JSON.stringify({
				token,
				requiredScopes: {
					method: 'one',
					names: ['example-scope', 'another-example-scope'],
				},
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

	it('should respond with 200 OK with valid if token is valid for rsa256 tokens', async () => {
		const token = await getOAuthToken(env.BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

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

	it('should respond with 200 OK with valid if token is valid for hsa256 tokens', async () => {
		const rootToken = await getOAuthToken(env.BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const createApi = new Request(`${env.BASE_URL}/v1/apis.createApi`, {
			method: 'POST',
			body: JSON.stringify({
				name: generateRandomName(),
				algorithm: 'hsa256',
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${rootToken}`,
			},
		});

		const newApi = await fetch(createApi);

		const createClient = new Request(`${env.BASE_URL}/v1/clients.createClient`, {
			method: 'POST',
			body: JSON.stringify({
				name: generateRandomName(),
				apiId: ((await newApi.json()) as any).id,
			}),
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${rootToken}`,
			},
		});

		const newClient = await fetch(createClient);
		const client = (await newClient.json()) as { clientId: string; clientSecret: string };

		const token = await getOAuthToken(env.BASE_URL, client.clientId, client.clientSecret);

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
