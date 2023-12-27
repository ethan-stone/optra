import { InvalidReason, decode, verify } from '@/crypto-utils';
import { db, keyManagementService, tokenBuckets } from '@/root';
import { Client } from '@/db';
import { Context } from 'hono';
import { HonoEnv } from '@/app';
import { Logger } from '@/logger';
import { TokenBucket } from '@/ratelimit';
import { Buffer } from '@/buffer';

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
export const verifyToken = async (token: string, ctx: { logger: Logger }): Promise<VerifyTokenResult> => {
	const logger = ctx.logger;

	let payload: ReturnType<typeof decode>;

	try {
		payload = decode(token);
	} catch (error) {
		logger.info(`Token is malformed.`);

		return {
			valid: false,
			message: 'JWT is malformed.',
			reason: 'BAD_JWT',
		};
	}

	logger.info(`Decoded token payload.`);

	if (!payload.payload) {
		logger.error(`Payload is somehow undefined despite being valid. This is fatal`);
		return {
			valid: false,
			message: 'JWT is malformed.',
			reason: 'BAD_JWT',
		};
	}

	const client = await db.getClientById(payload.payload.sub);

	if (!client) {
		logger.error(`Client with id ${payload.payload.sub} not found despite being verified. This is fatal`);
		return {
			valid: false,
			message: 'The client this token belongs to no longer exists.',
			reason: 'INVALID_CLIENT',
		};
	}

	logger.info(`Fetched client ${client.id} from payload.`);

	const workspace = await db.getWorkspaceById(client.workspaceId);

	if (!workspace) {
		logger.error(`Workspace with id ${client.workspaceId} not found despite being verified. This is fatal`);
		return {
			valid: false,
			message: 'The workspace this client belongs to no longer exists.',
			reason: 'INVALID_CLIENT',
		};
	}

	logger.info(`Fetched workspace ${workspace.id} from client.`);

	const api = await db.getApiById(client.apiId);

	if (!api) {
		logger.error(`Api with id ${client.apiId} not found despite being verified. This is fatal`);
		return {
			valid: false,
			message: 'The api this client belongs to no longer exists.',
			reason: 'INVALID_CLIENT',
		};
	}

	logger.info(`Fetched api ${api.id} from client.`);

	const signingSecret = await db.getSigningSecretById(api.signingSecretId);

	if (!signingSecret) {
		logger.error(`Signing secret with id ${api.signingSecretId} not found despite being verified. This is fatal`);
		return {
			valid: false,
			message: 'The signing secret this api belongs to no longer exists.',
			reason: 'INVALID_CLIENT',
		};
	}

	logger.info(`Fetched signing secret ${signingSecret.id} from api.`);

	const decryptResult = await keyManagementService.decryptWithDataKey(
		workspace.dataEncryptionKeyId,
		Buffer.from(signingSecret.secret, 'base64'),
		Buffer.from(signingSecret.iv, 'base64')
	);

	logger.info(`Decrypted signing secret.`);

	const verifyResult = await verify(token, Buffer.from(decryptResult.decryptedData).toString('base64'), {
		algorithm: 'HS256',
		throwError: false,
	});

	if (!verifyResult.valid) {
		return {
			valid: false,
			message: 'Token is invalid. Check the reason field to see why.',
			reason: verifyResult.reason,
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
