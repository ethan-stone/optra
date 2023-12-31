import { InvalidReason, decode, verify } from '@/crypto-utils';
import { cache, db, keyManagementService, tokenBuckets } from '@/root';
import { Client } from '@/db';
import { TokenBucket } from '@/ratelimit';
import { Buffer } from '@/buffer';
import { Context } from 'hono';
import { HonoEnv } from '@/app';

export type VerifyAuthHeaderResult =
	| {
			valid: true;
			token: string;
	  }
	| {
			valid: false;
			message: string;
	  };

export const verifyAuthHeader = async (header: string | undefined | null): Promise<VerifyAuthHeaderResult> => {
	if (!header) {
		return { valid: false, message: 'Authorization header is missing' };
	}

	const [type, token] = header.split(' ');

	if (type !== 'Bearer') {
		return { valid: false, message: 'Authorization header is missing the Bearer type' };
	}

	if (!token) {
		return { valid: false, message: 'Authorization header is missing the token' };
	}
	return { valid: true, token };
};

type VerifyTokenFailed = {
	valid: false;
	message: string;
	reason: keyof typeof InvalidReason;
};

type VerifyTokenSuccess = {
	valid: true;
	client: Client;
};

type VerifyTokenResult = VerifyTokenFailed | VerifyTokenSuccess;

/**
 * Use this to validate that the jwt is valid and belongs to a root client.
 * @param authorization Value of the Authorization header.
 */
export const verifyToken = async (token: string, ctx: Context<HonoEnv>): Promise<VerifyTokenResult> => {
	const logger = ctx.get('logger');

	let decoded: ReturnType<typeof decode>;

	try {
		decoded = decode(token);
	} catch (error) {
		logger.info(`Token is malformed.`);

		return {
			valid: false,
			message: 'JWT is malformed.',
			reason: 'BAD_JWT',
		};
	}

	logger.info(`Decoded token payload.`);

	const payload = decoded.payload;

	if (!payload) {
		logger.info(`Payload is undefined.`);
		return {
			valid: false,
			message: 'JWT is malformed.',
			reason: 'BAD_JWT',
		};
	}

	const data = await cache.fetchOrPopulate({ logger }, 'clientById', payload.sub, async (key) => {
		const client = await db.getClientById(key);

		if (!client) {
			logger.info(`Client with id ${key} not found.`);

			return null;
		}

		logger.info(`Fetched client ${client.id} from payload.`);

		const workspace = await db.getWorkspaceById(client.workspaceId);

		if (!workspace) {
			logger.info(`Workspace with id ${client.workspaceId} not found.`);

			return null;
		}

		logger.info(`Fetched workspace ${workspace.id} from client.`);

		const api = await db.getApiById(client.apiId);

		if (!api) {
			logger.info(`Api with id ${client.apiId} not found.`);

			return null;
		}

		logger.info(`Fetched api ${api.id} from client.`);

		logger.info(`Fetched signing secret ${api.signingSecretId} from api.`);

		const signingSecret = await db.getSigningSecretById(api.signingSecretId);

		if (!signingSecret) {
			logger.info(`Signing secret with id ${api.signingSecretId} not found despite being verified. This is fatal`);

			return null;
		}

		switch (signingSecret.algorithm) {
			case 'hsa256': {
				logger.info(`Decrypting signing secret for api ${api.id}`);

				const decryptResult = await keyManagementService.decryptWithDataKey(
					workspace.dataEncryptionKeyId,
					Buffer.from(signingSecret.secret, 'base64'),
					Buffer.from(signingSecret.iv, 'base64')
				);

				logger.info(`Decrypted signing secret.`);

				return {
					algorithm: 'hsa256',
					api,
					client,
					decryptedSigningSecret: decryptResult.decryptedData,
					workspace,
				};
			}
			case 'rsa256': {
				logger.info(`Fetching public key for api ${api.id}`);

				const publicJWKS = await ctx.env.JWKS_BUCKET.get(`${workspace.id}/${api.name}/.well-known/jwks.json`);

				logger.info(`Fetched public key for api ${api.id}`);

				if (!publicJWKS) {
					logger.error(`Public key for api ${api.id} not found.`);

					return null;
				}

				const jwks = JSON.parse(await publicJWKS.text()) as { keys: JsonWebKey[] };

				const importedKey = await crypto.subtle.importKey(
					'jwk',
					jwks.keys[0],
					{
						name: 'RSASSA-PKCS1-v1_5',
						hash: { name: 'SHA-256' },
					},
					true,
					['verify']
				);

				const exportedKey = await crypto.subtle.exportKey('spki', importedKey);

				return {
					algorithm: 'rsa256',
					api,
					client,
					workspace,
					publicKey: new Uint8Array(exportedKey),
				};
			}
		}
	});

	if (!data) {
		return {
			valid: false,
			message: 'The client, api, or workspace this token belongs to does not exist.',
			reason: 'INVALID_CLIENT',
		};
	}

	const { client, algorithm } = data;

	let verifyResult: Awaited<ReturnType<typeof verify>>;

	logger.info(`Verifying token signature.`);

	switch (algorithm) {
		case 'hsa256': {
			verifyResult = await verify(token, Buffer.from(data.decryptedSigningSecret).toString('base64'), {
				algorithm: 'HS256',
				throwError: false,
			});
			break;
		}
		case 'rsa256': {
			const publicKeyStr = '-----BEGIN PUBLIC KEY-----\n' + Buffer.from(data.publicKey).toString('base64') + '\n-----END PUBLIC KEY-----';
			verifyResult = await verify(token, publicKeyStr, {
				algorithm: 'RS256',
				throwError: false,
			});
			break;
		}
	}

	if (!verifyResult.valid) {
		return {
			valid: false,
			message: 'Token is invalid. Check the reason field to see why.',
			reason: verifyResult.reason,
		};
	}

	if (payload.secret_expires_at && payload.secret_expires_at < Date.now() / 1000) {
		return {
			valid: false,
			message: 'Token is invalid. Check the reason field to see why.',
			reason: 'SECRET_EXPIRED',
		};
	}

	if (payload.version !== client.version) {
		return {
			valid: false,
			message: 'Token is invalid. Check the reason field to see why.',
			reason: 'VERSION_MISMATCH',
		};
	}

	logger.info(`Verified token signature.`);

	if (!client.rateLimitBucketSize || !client.rateLimitRefillAmount || !client.rateLimitRefillInterval) {
		logger.info(`Client ${client.id} has no rate limit. Token is valid.`);
		return {
			valid: true,
			client,
		};
	}

	logger.info(`Client ${client.id} has a rate limit. Checking if they have exceeded it.`);

	let tokenBucket = tokenBuckets.get(client.id);

	if (!tokenBucket) {
		tokenBucket = new TokenBucket({
			refillAmount: client.rateLimitRefillAmount,
			refillInterval: client.rateLimitRefillInterval,
			size: client.rateLimitBucketSize,
			tokens: client.rateLimitBucketSize,
		});

		tokenBuckets.set(client.id, tokenBucket);
	}

	if (!tokenBucket.getTokens(1)) {
		logger.info(`Client ${client.id} has exceeded their rate limit`);
		return {
			valid: false,
			message: 'You have exceeded your rate limit.',
			reason: 'RATELIMIT_EXCEEDED',
		};
	}

	logger.info(`Client ${client.id} has not exceeded their rate limit. Token is valid.`);

	return { valid: true, client };
};
