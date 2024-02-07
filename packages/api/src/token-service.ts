import { Client, Db, SigningSecret } from '@/db';
import { InvalidReason, decode, verify } from '@/crypto-utils';
import { Context } from 'hono';
import { HonoEnv } from '@/app';
import { KeyManagementService } from '@/key-management';
import { Cache, CacheNamespaces } from '@/cache';
import { TokenBucket } from '@/ratelimit';
import { Buffer } from '@/buffer';
import { Analytics } from '@/analytics';

export type VerifyAuthHeaderResult =
	| {
			valid: true;
			token: string;
	  }
	| {
			valid: false;
			message: string;
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

type VerifyTokenOptions = {
	requiredScopes?: {
		method: 'one' | 'all';
		names: string[];
	} | null;
};

export interface TokenService {
	verifyToken(token: string, ctx: Context<HonoEnv>): Promise<VerifyTokenResult>;
	verifyAuthHeader(header: string | null | undefined): Promise<VerifyAuthHeaderResult>;
}

export class TokenService implements TokenService {
	constructor(
		private readonly db: Db,
		private readonly keyManagementService: KeyManagementService,
		private readonly cache: Cache<CacheNamespaces>,
		private readonly tokenBuckets: Map<string, TokenBucket>,
		private readonly analytics: Analytics
	) {}

	async verifyAuthHeader(header: string | null | undefined): Promise<VerifyAuthHeaderResult> {
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
	}

	async verifyToken(token: string, ctx: Context<HonoEnv>, options?: VerifyTokenOptions): Promise<VerifyTokenResult> {
		const logger = ctx.get('logger');
		const db = this.db;
		const cache = this.cache;
		const keyManagementService = this.keyManagementService;
		const tokenBuckets = this.tokenBuckets;
		const analytics = this.analytics;

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
		const header = decoded.header;

		if (!payload || !header) {
			logger.info(`Payload and/or header is undefined.`);
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

			logger.info(`Fetched client ${client.id} from token.`);

			const [clientScopes, workspace, api] = await Promise.all([
				db.getClientScopesByClientId(client.id),
				db.getWorkspaceById(client.workspaceId),
				db.getApiById(client.apiId),
			]);

			if (!workspace) {
				logger.info(`Workspace with id ${client.workspaceId} not found.`);

				return null;
			}

			logger.info(`Fetched workspace ${workspace.id} from client.`);

			if (!api) {
				logger.info(`Api with id ${client.apiId} not found.`);

				return null;
			}

			logger.info(`Fetched api ${api.id} from client.`);

			const workspaceVerifications = await cache.fetchOrPopulate(
				{ logger },
				'tokenVerificationByWorkspaceId',
				workspace.id,
				async (key) => {
					const now = new Date();
					const year = now.getUTCFullYear();
					const month = now.getUTCMonth() + 1;

					const res = await analytics.getVerificationsForWorkspace({
						workspaceId: key,
						month,
						year,
					});

					return {
						successful: res.successful,
						failed: res.failed,
					};
				}
			);

			// check if workspace has reached token verification limit
			if ((!workspace.billingInfo || !workspace.billingInfo.subscriptions) && workspaceVerifications.successful >= 5000) {
				logger.info(`Workspace has reached free tier limit`);

				return null;
			}

			let nextSigningSecret: SigningSecret | null = null;

			const currentSigningSecret = await db.getSigningSecretById(api.currentSigningSecretId);
			if (api.nextSigningSecretId) nextSigningSecret = await db.getSigningSecretById(api.nextSigningSecretId);

			if (!currentSigningSecret) {
				logger.info(`Somehow current signing secret ${api.currentSigningSecretId} for api ${api.id} does not exist. This is fatal`);

				return null;
			}

			logger.info(`Fetched signing secrets for api ${api.id}.`);

			switch (currentSigningSecret.algorithm) {
				case 'hsa256': {
					logger.info(`Decrypting signing secret for api ${api.id}`);

					const currentSigningSecretDecryptResult = await keyManagementService.decryptWithDataKey(
						workspace.dataEncryptionKeyId,
						Buffer.from(currentSigningSecret.secret, 'base64'),
						Buffer.from(currentSigningSecret.iv, 'base64')
					);

					let nextSigningSecretDecryptResult: Awaited<ReturnType<typeof keyManagementService.decryptWithDataKey>> | null = null;

					if (nextSigningSecret)
						nextSigningSecretDecryptResult = await keyManagementService.decryptWithDataKey(
							workspace.dataEncryptionKeyId,
							Buffer.from(nextSigningSecret.secret, 'base64'),
							Buffer.from(nextSigningSecret.iv, 'base64')
						);

					logger.info(`Decrypted signing secret.`);

					return {
						algorithm: 'hsa256',
						api,
						client,
						clientScopes,
						currentSigningSecret: {
							id: currentSigningSecret.id,
							decryptedSigningSecret: currentSigningSecretDecryptResult.decryptedData,
						},
						nextSigningSecret: nextSigningSecret
							? { id: nextSigningSecret.id, decryptedSigningSecret: nextSigningSecretDecryptResult!.decryptedData }
							: undefined,
						workspace,
					};
				}
				case 'rsa256': {
					logger.info(`Fetching public key for api ${api.id}`);

					const url = `${ctx.env.JWKS_BUCKET_URL}/${workspace.id}/${api.name.replace(/\s/g, '-')}/.well-known/jwks.json`;

					const req = new Request(url, {
						method: 'GET',
					});

					const res = await fetch(req);

					if (res.status !== 200) {
						logger.error(`Public keys for api ${api.id} could not be retrieved.`);

						return null;
					}

					const jwks = JSON.parse(await res.text()) as { keys: (JsonWebKey & { kid: string })[] };

					const publicKeys: Uint8Array[] = [];

					for (const key of jwks.keys) {
						const importedKey = await crypto.subtle.importKey(
							'jwk',
							key,
							{
								name: 'RSASSA-PKCS1-v1_5',
								hash: { name: 'SHA-256' },
							},
							true,
							['verify']
						);

						const exportedKey = (await crypto.subtle.exportKey('spki', importedKey)) as ArrayBuffer;

						publicKeys.push(new Uint8Array(exportedKey));
					}

					// if somehow there are no public keys, this is fatal
					if (publicKeys.length === 0) {
						logger.error(`Public key for api ${api.id} not found.`);
						return null;
					}

					return {
						algorithm: 'rsa256',
						api,
						client,
						clientScopes,
						workspace,
						publicKeys,
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

		if (options?.requiredScopes) {
			if (options.requiredScopes.method === 'one') {
				const hasAtLeastOneScope = options.requiredScopes.names.some((name) => {
					const apiScope = data.api.scopes.find((scope) => scope.name === name);

					if (!apiScope) return false;

					return data.clientScopes.some((clientScope) => clientScope.apiScopeId === apiScope.id);
				});

				if (!hasAtLeastOneScope) {
					ctx.executionCtx.waitUntil(
						analytics.publish('token.verified', [
							{
								apiId: client.apiId,
								clientId: client.id,
								workspaceId: client.workspaceId,
								timestamp: Date.now(),
								deniedReason: 'MISSING_SCOPES',
							},
						])
					);

					return {
						valid: false,
						reason: 'MISSING_SCOPES',
						message: 'Token is missing one or more required scopes.',
					};
				}
			}

			if (options.requiredScopes.method === 'all') {
				const hasAllScopes = options.requiredScopes.names.every((name) => {
					const apiScope = data.api.scopes.find((scope) => scope.name === name);

					if (!apiScope) return false;

					return data.clientScopes.some((clientScope) => clientScope.apiScopeId === apiScope.id);
				});

				if (!hasAllScopes) {
					ctx.executionCtx.waitUntil(
						analytics.publish('token.verified', [
							{
								apiId: client.apiId,
								clientId: client.id,
								workspaceId: client.workspaceId,
								timestamp: Date.now(),
								deniedReason: 'MISSING_SCOPES',
							},
						])
					);

					return {
						valid: false,
						reason: 'MISSING_SCOPES',
						message: 'Token is missing one or more required scopes.',
					};
				}
			}
		}

		let verifyResult: Awaited<ReturnType<typeof verify>> | null = null;

		logger.info(`Verifying token signature.`);

		switch (algorithm) {
			case 'hsa256': {
				if (header.kid === data.currentSigningSecret.id) {
					logger.info(`Verifying token signature with current signing secret.`);
					verifyResult = await verify(token, Buffer.from(data.currentSigningSecret.decryptedSigningSecret).toString('base64'), {
						algorithm: 'HS256',
						throwError: false,
					});
					break;
				}

				if (data.nextSigningSecret && header.kid === data.nextSigningSecret.id) {
					logger.info(`Verifying token signature with next signing secret.`);
					verifyResult = await verify(token, Buffer.from(data.currentSigningSecret.decryptedSigningSecret).toString('base64'), {
						algorithm: 'HS256',
						throwError: false,
					});
					break;
				}

				logger.info(`Token has an unknown signing secret id.`);
				break;
			}
			case 'rsa256': {
				for (const publicKey of data.publicKeys) {
					const publicKeyStr = '-----BEGIN PUBLIC KEY-----\n' + Buffer.from(publicKey).toString('base64') + '\n-----END PUBLIC KEY-----';
					verifyResult = await verify(token, publicKeyStr, {
						algorithm: 'RS256',
						throwError: false,
					});
					// If the token is valid with any of the public keys, we can stop checking.
					if (verifyResult.valid) break;
				}
			}
		}

		if (!verifyResult) {
			logger.info(`Token is invalid. Reason: INVALID_SIGNATURE`);
			return {
				valid: false,
				message: 'Token is invalid. Check the reason field to see why.',
				reason: 'INVALID_SIGNATURE',
			};
		}

		if (!verifyResult.valid) {
			if (verifyResult.reason === 'EXPIRED' || verifyResult.reason === 'MISSING_SCOPES') {
				ctx.executionCtx.waitUntil(
					analytics.publish('token.verified', [
						{
							apiId: client.apiId,
							clientId: client.id,
							workspaceId: client.workspaceId,
							timestamp: Date.now(),
							deniedReason: verifyResult.reason,
						},
					])
				);
			}

			return {
				valid: false,
				message: 'Token is invalid. Check the reason field to see why.',
				reason: verifyResult.reason,
			};
		}

		if (payload.secret_expires_at && payload.secret_expires_at < Date.now() / 1000) {
			ctx.executionCtx.waitUntil(
				analytics.publish('token.verified', [
					{
						apiId: client.apiId,
						clientId: client.id,
						workspaceId: client.workspaceId,
						timestamp: Date.now(),
						deniedReason: 'SECRET_EXPIRED',
					},
				])
			);

			return {
				valid: false,
				message: 'Token is invalid. Check the reason field to see why.',
				reason: 'SECRET_EXPIRED',
			};
		}

		if (payload.version !== client.version) {
			ctx.executionCtx.waitUntil(
				analytics.publish('token.verified', [
					{
						apiId: client.apiId,
						clientId: client.id,
						workspaceId: client.workspaceId,
						timestamp: Date.now(),
						deniedReason: 'VERSION_MISMATCH',
					},
				])
			);

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

			ctx.executionCtx.waitUntil(
				analytics.publish('token.verified', [
					{
						apiId: client.apiId,
						clientId: client.id,
						workspaceId: client.workspaceId,
						timestamp: Date.now(),
						deniedReason: 'RATELIMIT_EXCEEDED',
					},
				])
			);

			return {
				valid: false,
				message: 'You have exceeded your rate limit.',
				reason: 'RATELIMIT_EXCEEDED',
			};
		}

		logger.info(`Client ${client.id} has not exceeded their rate limit. Token is valid.`);

		ctx.executionCtx.waitUntil(
			analytics.publish('token.verified', [
				{
					apiId: client.apiId,
					clientId: client.id,
					workspaceId: client.workspaceId,
					timestamp: Date.now(),
					deniedReason: null,
				},
			])
		);

		return { valid: true, client };
	}
}
