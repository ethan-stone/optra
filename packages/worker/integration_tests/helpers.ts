import { GetOAuthTokenRes } from '@/v1/get-oauth-token';

export async function getOAuthToken(clientId: string, clientSecret: string): Promise<string> {
	const req = new Request('http://localhost:8787/v1/oauth/token', {
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

	const res = await fetch(req);
	const resJson = (await res.json()) as GetOAuthTokenRes;

	return resJson.accessToken;
}
