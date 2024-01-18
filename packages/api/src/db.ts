import * as schema from '@optra/db/schema';
import { connect } from '@planetscale/database';
import { drizzle, PlanetScaleDatabase } from 'drizzle-orm/planetscale-serverless';
import { InferSelectModel, InferInsertModel, eq, and, gt, or, isNull, SQL, desc } from 'drizzle-orm';
import { uid } from '@/uid';
import { hashSHA256 } from '@/crypto-utils';

export * from 'drizzle-orm';
export * from '@optra/db/index';

export function createConnection(url: string) {
	const connection = connect({
		url,
		fetch: (url: string, init: any) => {
			init.cache = undefined;
			return fetch(url, init);
		},
	});

	return drizzle(connection, {
		schema,
	});
}

type InsertClientModel = InferInsertModel<(typeof schema)['clients']>;

export type Client = InferSelectModel<(typeof schema)['clients']> & { scopes?: string[] };
export type CreateRootClientParams = Omit<InsertClientModel, 'id' | 'forWorkspaceId' | 'currentClientSecretId' | 'nextClientSecretId'> &
	Required<Pick<InsertClientModel, 'forWorkspaceId'>>;
export type CreateBasicClientParams = Omit<InsertClientModel, 'id' | 'forWorkspaceId' | 'currentClientSecretId' | 'nextClientSecretId'> & {
	apiScopes?: string[];
};
export type CreateClientScopeParams = Omit<InferInsertModel<(typeof schema)['clientScopes']>, 'id'>;
export type ClientSecret = Omit<InferSelectModel<(typeof schema)['clientSecrets']>, 'secret'>;
export type ClientScope = InferSelectModel<(typeof schema)['clientScopes']>;
export type ClientSecretCreateResult = InferSelectModel<(typeof schema)['clientSecrets']>;
export type InsertApiModel = InferInsertModel<(typeof schema)['apis']>;
export type CreateApiParams = Omit<InsertApiModel, 'id' | 'currentSigningSecretId' | 'nextSigningSecretId'> & {
	scopes?: { name: string; description: string }[];
	algorithm: 'hsa256' | 'rsa256';
	encryptedSigningSecret: string;
	iv: string;
};
export type ApiScope = InferSelectModel<(typeof schema)['apiScopes']>;
export type CreateApiScopeParams = Omit<InferInsertModel<(typeof schema)['apiScopes']>, 'id'>;
export type Api = InferSelectModel<(typeof schema)['apis']> & { scopes: ApiScope[] };
export type Workspace = InferSelectModel<(typeof schema)['workspaces']>;
export type InsertWorkspaceModel = InferInsertModel<(typeof schema)['workspaces']>;
export type CreateWorkspaceParams = Omit<InsertWorkspaceModel, 'id'>;
export type DataEncryptionKey = InferSelectModel<(typeof schema)['dataEncryptionKeys']>;
export type SigningSecret = InferSelectModel<(typeof schema)['signingSecrets']>;
export type RotateClientSecretParams = {
	clientId: string;
	secretId: string;
	expiresAt: Date;
};

export interface Db {
	getClientById(id: string): Promise<Client | null>;
	deleteClientById(id: string): Promise<void>;
	getClientSecretValueById(secretId: string): Promise<string | null>;
	getClientSecretById(secretId: string): Promise<ClientSecret | null>;
	getClientScopesByClientId(clientId: string): Promise<ClientScope[]>;
	createRootClient(params: CreateRootClientParams): Promise<{ id: string; secret: string }>;
	createBasicClient(params: CreateBasicClientParams): Promise<{ id: string; secret: string }>;
	createClientScope(params: CreateClientScopeParams): Promise<{ id: string }>;
	deleteClientScopeByApiScopeId(id: string): Promise<void>;
	createWorkspace(params: CreateWorkspaceParams): Promise<{ id: string }>;
	getWorkspaceById(id: string): Promise<Workspace | null>;
	createApi(params: CreateApiParams): Promise<{ id: string }>;
	getApiById(id: string): Promise<Api | null>;
	getApiByWorkspaceAndName(workspaceId: string, name: string): Promise<Api | null>;
	deleteApiById(id: string): Promise<void>;
	createApiScope(params: CreateApiScopeParams): Promise<{ id: string }>;
	deleteApiScopeById(id: string): Promise<void>;
	getSigningSecretById(id: string): Promise<SigningSecret | null>;
	getDataEncryptionKeyById(id: string): Promise<DataEncryptionKey | null>;
	rotateClientSecret(params: RotateClientSecretParams): Promise<ClientSecretCreateResult>;
}

export class PlanetScaleDb implements Db {
	constructor(private readonly db: PlanetScaleDatabase<typeof schema>) {
		this.db.query;
	}

	async getClientById(id: string): Promise<Client | null> {
		const client = await this.db.query.clients.findFirst({
			where: and(eq(schema.clients.id, id), isNull(schema.clients.deletedAt)),
			with: {
				scopes: {
					with: {
						apiScope: true,
					},
				},
			},
		});

		if (!client) return null;

		const scopes = client.scopes.map((s) => s.apiScope.name);

		return client ? { ...client, scopes } : null;
	}

	async deleteClientById(id: string): Promise<void> {
		await this.db.update(schema.clients).set({ deletedAt: new Date() }).where(eq(schema.clients.id, id));
	}

	async getClientSecretValueById(id: string): Promise<string | null> {
		const secrets = await this.db.query.clientSecrets.findFirst({
			where: eq(schema.clientSecrets.id, id),
			columns: {
				secret: true,
			},
		});

		return secrets?.secret ?? null;
	}

	async getClientSecretById(id: string): Promise<ClientSecret | null> {
		const secret = await this.db.query.clientSecrets.findFirst({
			where: eq(schema.clientSecrets.id, id),
			columns: {
				secret: false,
			},
		});

		return secret ?? null;
	}

	async getClientScopesByClientId(clientId: string): Promise<ClientScope[]> {
		const scopes = await this.db.query.clientScopes.findMany({
			where: eq(schema.clientScopes.clientId, clientId),
		});

		return scopes;
	}

	async createRootClient(params: CreateRootClientParams): Promise<{ id: string; secret: string }> {
		const clientId = uid('client');
		const secretId = uid('client_secret');
		const secretValue = uid();

		await this.db.transaction(async (tx) => {
			await tx.insert(schema.clients).values({
				id: clientId,
				currentClientSecretId: secretId,
				...params,
			});

			await tx.insert(schema.clientSecrets).values({
				id: secretId,
				secret: secretValue,
				status: 'active',
				createdAt: new Date(),
			});
		});

		return {
			id: clientId,
			secret: secretValue,
		};
	}

	async createBasicClient(params: CreateBasicClientParams): Promise<{ id: string; secret: string }> {
		const clientId = params.prefix ? params.prefix + '_' + uid() : uid('client');
		const secretId = uid('client_secret');
		const secretValue = params.prefix ? params.prefix + '_' + uid(undefined, 48) : uid(undefined, 48);

		const now = new Date();

		await this.db.transaction(async (tx) => {
			await tx.insert(schema.clients).values({
				id: clientId,
				currentClientSecretId: secretId,
				...params,
			});

			await tx.insert(schema.clientSecrets).values({
				id: secretId,
				secret: await hashSHA256(secretValue),
				status: 'active',
				createdAt: now,
			});

			if (params.apiScopes) {
				for (const apiScope of params.apiScopes) {
					await tx.insert(schema.clientScopes).values({
						id: uid('client_scope'),
						apiScopeId: apiScope,
						clientId: clientId,
						createdAt: now,
						updatedAt: now,
					});
				}
			}
		});

		return {
			id: clientId,
			secret: secretValue,
		};
	}

	async createClientScope(params: CreateClientScopeParams): Promise<{ id: string }> {
		const clientScopeId = uid('client_scope');

		await this.db.insert(schema.clientScopes).values({
			id: clientScopeId,
			...params,
		});

		return {
			id: clientScopeId,
		};
	}

	async deleteClientScopeByApiScopeId(apiScopeId: string): Promise<void> {
		await this.db.delete(schema.clientScopes).where(eq(schema.clientScopes.apiScopeId, apiScopeId));
	}

	async createWorkspace(params: CreateWorkspaceParams): Promise<{ id: string }> {
		const workspaceId = uid('ws');

		await this.db.insert(schema.workspaces).values({
			id: workspaceId,
			...params,
		});

		return {
			id: workspaceId,
		};
	}

	async getWorkspaceById(id: string): Promise<Workspace | null> {
		const workspace = await this.db.query.workspaces.findFirst({
			where: eq(schema.workspaces.id, id),
		});

		return workspace ?? null;
	}

	async createApi(params: CreateApiParams): Promise<{ id: string }> {
		const apiId = uid('api');
		const signingSecretId = uid('signing_secret');

		await this.db.transaction(async (tx) => {
			await tx.insert(schema.signingSecrets).values({
				id: signingSecretId,
				secret: params.encryptedSigningSecret,
				iv: params.iv,
				algorithm: params.algorithm,
				updatedAt: new Date(),
				createdAt: new Date(),
			});

			await tx.insert(schema.apis).values({
				id: apiId,
				currentSigningSecretId: signingSecretId,
				...params,
			});

			const now = new Date();

			if (params.scopes) {
				for (const scopes of params.scopes) {
					await tx.insert(schema.apiScopes).values({
						id: uid('api_scope'),
						apiId: apiId,
						name: scopes.name,
						description: scopes.description,
						createdAt: now,
						updatedAt: now,
					});
				}
			}
		});

		return {
			id: apiId,
		};
	}

	async getApiById(id: string): Promise<Api | null> {
		const api = await this.db.query.apis.findFirst({
			where: and(eq(schema.apis.id, id), isNull(schema.apis.deletedAt)),
			with: {
				scopes: true,
			},
		});

		return api ?? null;
	}

	async getApiByWorkspaceAndName(workspaceId: string, name: string): Promise<Api | null> {
		const api = await this.db.query.apis.findFirst({
			where: and(eq(schema.apis.workspaceId, workspaceId), eq(schema.apis.name, name), isNull(schema.apis.deletedAt)),
			with: {
				scopes: true,
			},
		});

		return api ?? null;
	}

	async deleteApiById(id: string): Promise<void> {
		await this.db.update(schema.apis).set({ deletedAt: new Date() }).where(eq(schema.apis.id, id));
	}

	async createApiScope(params: CreateApiScopeParams): Promise<{ id: string }> {
		const apiScopeId = uid('api_scope');

		await this.db.insert(schema.apiScopes).values({
			id: apiScopeId,
			...params,
		});

		return { id: apiScopeId };
	}

	async getSigningSecretById(id: string): Promise<SigningSecret | null> {
		const secret = await this.db.query.signingSecrets.findFirst({
			where: eq(schema.signingSecrets.id, id),
		});

		return secret ?? null;
	}

	async deleteApiScopeById(id: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			await tx.delete(schema.apiScopes).where(eq(schema.apiScopes.id, id));

			await tx.delete(schema.clientScopes).where(eq(schema.clientScopes.apiScopeId, id));
		});
	}

	async getDataEncryptionKeyById(id: string): Promise<DataEncryptionKey | null> {
		const dek = await this.db.query.dataEncryptionKeys.findFirst({
			where: eq(schema.dataEncryptionKeys.id, id),
		});

		return dek ?? null;
	}

	async rotateClientSecret(params: RotateClientSecretParams): Promise<ClientSecretCreateResult> {
		// increment version of the client
		const client = await this.db.query.clients.findFirst({
			where: eq(schema.clients.id, params.clientId),
		});

		if (!client) throw new Error(`Could not find client ${params.clientId}`);

		const prefix = client.prefix;

		const secretId = uid('client_secret');
		const secretValue = prefix ? prefix + '_' + uid(undefined, 48) : uid(undefined, 48);
		const hashedSecretValue = await hashSHA256(secretValue);

		const now = new Date();

		await this.db.transaction(async (tx) => {
			// update the old secret to have expiration date
			await tx
				.update(schema.clientSecrets)
				.set({
					expiresAt: params.expiresAt,
				})
				.where(eq(schema.clientSecrets.id, params.secretId));

			// create a new secret
			await tx.insert(schema.clientSecrets).values({
				id: secretId,
				secret: hashedSecretValue,
				status: 'active',
				createdAt: now,
			});

			// set the new secret as the next client secret
			await tx
				.update(schema.clients)
				.set({
					version: client.version + 1,
					nextClientSecretId: secretId,
				})
				.where(eq(schema.clients.id, params.clientId));
		});

		return {
			id: secretId,
			secret: secretValue,
			status: 'active',
			expiresAt: null,
			createdAt: now,
		};
	}
}
