import { InvalidReason, decode, verify } from '@/crypto-utils';
import { db, tokenBuckets } from '@/root';
import { Client } from '@/db';
import { Context } from 'hono';
import { HonoEnv } from '@/app';
import { Logger } from '@/logger';
import { TokenBucket } from '@/ratelimit';

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
export const verifyToken = async (token: string, secret: string, ctx: { logger: Logger }): Promise<VerifyTokenResult> => {
	const logger = ctx.logger;

	const verifyResult = await verify(token, secret, { algorithm: 'HS256', throwError: false });

	if (!verifyResult.valid) {
		return {
			valid: false,
			message: 'Token is invalid. Check the reason field to see why.',
			reason: verifyResult.reason,
		};
	}

	const payload = decode(token);

	if (!payload.payload) {
		logger.error(`Payload is somehow undefined despite being valid. This is fatal`);
		return {
			valid: false,
			message: 'Payload is invalid.',
			reason: 'INVALID_SIGNATURE',
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

	if (!client.rateLimitBucketSize || !client.rateLimitRefillAmount || !client.rateLimitRefillInterval)
		return {
			valid: true,
			client,
		};

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

	return { valid: true, client };
};
