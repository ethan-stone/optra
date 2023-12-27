import { schema } from '@optra/db';
import { connect } from '@planetscale/database';
import { drizzle, PlanetScaleDatabase } from 'drizzle-orm/planetscale-serverless';
import { InferSelectModel, InferInsertModel, eq } from 'drizzle-orm';
import { uid } from '@/uid';
import { hashSHA256 } from '@/crypto-utils';

export * from 'drizzle-orm';
export * from '@optra/db';

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

export type Client = InferSelectModel<(typeof schema)['clients']>;
export type CreateRootClientParams = Omit<InsertClientModel, 'id' | 'forWorkspaceId'> & Required<Pick<InsertClientModel, 'forWorkspaceId'>>;
export type CreateBasicClientParams = Omit<InsertClientModel, 'id' | 'forWorkspaceId'>;
export type ClientSecret = Omit<InferSelectModel<(typeof schema)['clientSecrets']>, 'secret'>;
export type InsertApiModel = InferInsertModel<(typeof schema)['apis']>;
export type CreateApiParams = Omit<InsertApiModel, 'id' | 'signingSecretId'> & {
	scopes?: { name: string; description: string }[];
	encryptedSigningSecret: string;
	iv: string;
};
export type Api = InferSelectModel<(typeof schema)['apis']>;
export type Workspace = InferSelectModel<(typeof schema)['workspaces']>;
export type InsertWorkspaceModel = InferInsertModel<(typeof schema)['workspaces']>;
export type CreateWorkspaceParams = Omit<InsertWorkspaceModel, 'id'>;
export type DataEncryptionKey = InferSelectModel<(typeof schema)['dataEncryptionKeys']>;

export interface Db {
	getClientById(id: string): Promise<Client | null>;
	getClientSecretsByClientId(clientId: string): Promise<ClientSecret[]>;
	getClientSecretValueById(secretId: string): Promise<string | null>;
	createRootClient(params: CreateRootClientParams): Promise<{ id: string; secret: string }>;
	createBasicClient(params: CreateBasicClientParams): Promise<{ id: string; secret: string }>;
	createWorkspace(params: CreateWorkspaceParams): Promise<{ id: string }>;
	getWorkspaceById(id: string): Promise<Workspace | null>;
	createApi(params: CreateApiParams): Promise<{ id: string }>;
	getApiById(id: string): Promise<Api | null>;
	getDataEncryptionKeyById(id: string): Promise<DataEncryptionKey | null>;
}

export class PlanetScaleDb implements Db {
	constructor(private readonly db: PlanetScaleDatabase<typeof schema>) {}

	async getClientById(id: string) {
		const client = await this.db.query.clients.findFirst({
			where: eq(schema.clients.id, id),
		});

		return client ?? null;
	}

	async getClientSecretsByClientId(clientId: string) {
		const secrets = await this.db.query.clientSecrets.findMany({
			where: eq(schema.clientSecrets.clientId, clientId),
			columns: {
				secret: false,
			},
		});

		return secrets;
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

	async createRootClient(params: CreateRootClientParams): Promise<{ id: string; secret: string }> {
		const clientId = uid('client');
		const secretId = uid('client_secret');
		const secretValue = uid();

		await this.db.transaction(async (tx) => {
			await tx.insert(schema.clients).values({
				id: clientId,
				...params,
			});

			await tx.insert(schema.clientSecrets).values({
				id: secretId,
				clientId: clientId,
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
		const clientId = uid('client');
		const secretId = uid('client_secret');
		const secretValue = uid();

		await this.db.transaction(async (tx) => {
			await tx.insert(schema.clients).values({
				id: clientId,
				...params,
			});

			await tx.insert(schema.clientSecrets).values({
				id: secretId,
				clientId: clientId,
				secret: await hashSHA256(secretValue),
				status: 'active',
				createdAt: new Date(),
			});
		});

		return {
			id: clientId,
			secret: secretValue,
		};
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
				algorithm: 'hsa256',
				updatedAt: new Date(),
				createdAt: new Date(),
			});

			await tx.insert(schema.apis).values({
				id: apiId,
				signingSecretId: signingSecretId,
				...params,
			});

			const now = new Date();

			if (params.scopes) {
				for (const scopes of params.scopes) {
					await tx.insert(schema.apiScopes).values({
						id: uid('api_scope'),
						apiId: apiId,
						name: scopes.name,
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
			where: eq(schema.apis.id, id),
		});

		return api ?? null;
	}

	async getDataEncryptionKeyById(id: string): Promise<DataEncryptionKey | null> {
		const dek = await this.db.query.dataEncryptionKeys.findFirst({
			where: eq(schema.dataEncryptionKeys.id, id),
		});

		return dek ?? null;
	}
}
