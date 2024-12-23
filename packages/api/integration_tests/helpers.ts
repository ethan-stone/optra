import { GetOAuthTokenRes } from '@/v1/get-oauth-token';

export function generateRandomName() {
	// Arrays of animals and colors
	const animals = ['Lion', 'Tiger', 'Bear', 'Elephant', 'Panther', 'Giraffe'];
	const colors = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange'];

	// Randomly select an animal and a color
	const animal = animals[Math.floor(Math.random() * animals.length)];
	const color = colors[Math.floor(Math.random() * colors.length)];

	// Generate a random six-digit number
	const number = Math.floor(Math.random() * 900000) + 100000;

	// Concatenate them to form the name
	return `${color}${animal}${number}`;
}

export async function getOAuthToken(baseUrl: string, clientId: string, clientSecret: string): Promise<string> {
	const res = await fetch(`${baseUrl}/v1/oauth/token`, {
		method: 'POST',
		body: JSON.stringify({
			grantType: 'client_credentials',
			clientId,
			clientSecret,
		}),
		headers: {
			'Content-Type': 'application/json',
		},
	});

	if (res.status !== 200) {
		throw new Error(`Failed to get oauth token. Optra-Request-Id: ${res.headers.get('Optra-Request-Id')}`);
	}

	const resJson = (await res.json()) as GetOAuthTokenRes;

	return resJson.accessToken;
}

export async function createApi(
	baseUrl: string,
	token: string,
	args: {
		algorithm: 'hsa256' | 'rsa256';
	},
): Promise<{ id: string; name: string }> {
	const name = generateRandomName();

	const res = await fetch(`${baseUrl}/v1/apis.createApi`, {
		method: 'POST',
		body: JSON.stringify({
			name,
			algorithm: args.algorithm,
		}),
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
	});

	if (res.status !== 200) {
		throw new Error(`Failed to create client. Optra-Request-Id: ${res.headers.get('Optra-Request-Id')}`);
	}

	const resJson = await res.json();

	return { id: (resJson as any).id, name };
}

export async function createClient(
	baseUrl: string,
	token: string,
	args: {
		apiId: string;
	},
): Promise<{ clientId: string; clientSecret: string }> {
	const res = await fetch(`${baseUrl}/v1/clients.createClient`, {
		method: 'POST',
		body: JSON.stringify({
			name: generateRandomName(),
			apiId: args.apiId,
		}),
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
	});

	if (res.status !== 200) {
		throw new Error(`Failed to create client. Optra-Request-Id: ${res.headers.get('Optra-Request-Id')}`);
	}

	const resJson = await res.json();

	return { clientId: (resJson as any).clientId, clientSecret: (resJson as any).clientSecret };
}

export function generateJsonObject(numKeys: number): Record<string, unknown> {
	const obj: Record<string, unknown> = {};

	for (let i = 0; i < numKeys; i++) {
		obj[`key-${i}`] = `value-${i}`;
	}

	return obj;
}

export async function withRetry<T>(fn: () => Promise<T>, retries: number = 3): Promise<T> {
	try {
		return await fn();
	} catch (e) {
		if (retries === 0) {
			throw e;
		}

		return await withRetry(fn, retries - 1);
	}
}
