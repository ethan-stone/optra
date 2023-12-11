import { InvalidReason, decode, verify } from '@/crypto-utils';
import { db, logger } from '@/root';
import { Client } from '@/db';
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

type VerifyTokenResult =
	| {
			valid: true;
			client: Client;
	  }
	| {
			valid: false;
			message: string;
			reason: keyof typeof InvalidReason;
	  };

/**
 * Use this to validate that the jwt is valid and belongs to a root client.
 * @param authorization Value of the Authorization header.
 */
export const verifyToken = async (token: string, secret: string): Promise<VerifyTokenResult> => {
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
		throw new Error(`Payload is somehow undefined despite being valid. This is fatal`);
	}

	const client = await db.getClientById(payload.payload.sub);

	if (!client) {
		logger.error(`Client with id ${payload.payload.sub} not found despite being verified. This is fatal`);
		throw new Error(`Client with id ${payload.payload.sub} not found despite being verified. This is fatal`);
	}

	return { valid: true, client };
};

const parseVerifyTokenResultToHttpResponse = (c: Context<HonoEnv>, result: VerifyTokenResult) => {
	if (result.valid) {
		return c.json(
			{
				valid: true,
				client: {
					id: result.client.id,
					name: result.client.name,
					version: result.client.version,
					rateLimitBucketSize: result.client.rateLimitBucketSize,
					rateLimitRefillAmount: result.client.rateLimitRefillAmount,
					rateLimitRefillInterval: result.client.rateLimitRefillInterval,
				},
			},
			200
		);
	}

	if (result.reason === 'BAD_JWT') {
		return c.json({
			reason: 'BAD_JWT',
			message: 'The JWT is malformed',
		});
	} else if (result.reason === 'NOT_FOUND') {
		return c.json({
			reason: 'NOT_FOUND',
			message: 'A client with the given id was not found',
		});
	} else {
		return c.json({
			reason: result.reason,
			message: result.message,
		});
	}
};
