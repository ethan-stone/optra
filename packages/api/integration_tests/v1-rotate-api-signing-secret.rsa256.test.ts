import { describe, it, expect, beforeAll } from 'vitest';
import { testEnvSchema } from './test-env-schema';
import { createApi, createClient, getOAuthToken } from './helpers';

const env = testEnvSchema.parse(process.env);

describe('POST /v1/apis.rotateSigningSecret for rsa256 apis', () => {
	let apiId: string;
	let apiName: string;

	beforeAll(async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const api = await createApi(env.TEST_BASE_URL, token, {
			algorithm: 'rsa256',
		});

		apiId = api.id;
		apiName = api.name;
	});

	it('should respond with 400 BAD_REQUEST if invalid body', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.TEST_BASE_URL}/v1/apis.rotateSigningSecret`, {
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

	it('should respond with 403 FORBIDDEN if not root client', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.BASIC_CLIENT_ID, env.BASIC_CLIENT_SECRET);

		const req = new Request(`${env.TEST_BASE_URL}/v1/apis.rotateSigningSecret`, {
			method: 'POST',
			body: JSON.stringify({
				apiId,
				expiresIn: null,
			}), // missing fields
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		const res = await fetch(req);

		const resJson = await res.json();

		expect(res.status).toBe(403);
		expect(resJson).toHaveProperty('reason');
		expect(resJson).toHaveProperty('message');
		expect((resJson as any).reason).toBe('FORBIDDEN');
	});

	it('should respond with 404 NOT_FOUND if api does not actually exist', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.TEST_BASE_URL}/v1/apis.rotateSigningSecret`, {
			method: 'POST',
			body: JSON.stringify({
				apiId: 'does-not-exist',
				expiresIn: null,
			}), // missing fields
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

	it('should respond with 404 NOT_FOUND if client does not have access to api', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.OTHER_ROOT_CLIENT_ID, env.OTHER_ROOT_CLIENT_SECRET);

		const req = new Request(`${env.TEST_BASE_URL}/v1/apis.rotateSigningSecret`, {
			method: 'POST',
			body: JSON.stringify({
				apiId: apiId,
				expiresIn: null,
			}), // missing fields
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

	it('should respond with 200 OK and be able to create new token with secret', async () => {
		const token = await getOAuthToken(env.TEST_BASE_URL, env.ROOT_CLIENT_ID, env.ROOT_CLIENT_SECRET);

		const req = new Request(`${env.TEST_BASE_URL}/v1/apis.rotateSigningSecret`, {
			method: 'POST',
			body: JSON.stringify({
				apiId: apiId,
				expiresIn: null,
			}), // missing fields
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		const res = await fetch(req);

		const resJson = await res.json();

		expect(res.status).toBe(200);
		expect(resJson).toHaveProperty('id');

		const signingSecretId = (resJson as any).id;

		const client = await createClient(env.TEST_BASE_URL, token, {
			apiId,
		});

		const clientToken = await getOAuthToken(env.TEST_BASE_URL, client.clientId, client.clientSecret);

		const header = clientToken.split('.')[0];

		const headerJson = JSON.parse(atob(header));

		expect(headerJson).toHaveProperty('kid');
		expect(headerJson.kid).toEqual(signingSecretId);

		const jwksRes = await fetch(`${env.JWKS_BUCKET_URL}/${env.WORKSPACE_ID}/${apiId}/.well-known/jwks.json`, {
			method: 'GET',
		});

		const jwks = JSON.parse(await jwksRes.text());

		const jwk = jwks.keys.find((k: any) => k.kid === signingSecretId);

		expect(jwk).toBeDefined();
		expect(jwk.kid).toEqual(signingSecretId);
	});
});
