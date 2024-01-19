import { Api, Client, ClientScope, Workspace } from '@/db';
import { Logger } from '@/logger';

type CacheRecord<Value> = {
	value: Value;
	expiresAt: number; // in milliseconds
};

export type CacheNamespaces = {
	clientById:
		| {
				algorithm: 'hsa256';
				client: Client;
				clientScopes: ClientScope[];
				api: Api;
				workspace: Workspace;
				currentSigningSecret: {
					id: string;
					decryptedSigningSecret: Uint8Array;
				};
				nextSigningSecret?: {
					id: string;
					decryptedSigningSecret: Uint8Array;
				};
		  }
		| {
				algorithm: 'rsa256';
				client: Client;
				clientScopes: ClientScope[];
				api: Api;
				workspace: Workspace;
				publicKeys: Uint8Array[]; // it is possible for an api to have multiple public keys at the same time
		  }
		| null;
};

export interface Cache<Namespaces extends Record<string, unknown>> {
	get<Namespace extends keyof Namespaces>(namespace: Namespace, key: string): Promise<Namespaces[Namespace] | null>;
	set<Namespace extends keyof Namespaces>(namespace: Namespace, key: string, value: Namespaces[Namespace]): Promise<void>;
	delete<Namespace extends keyof Namespaces>(namespace: Namespace, key: string): Promise<void>;
	fetchOrPopulate<Namespace extends keyof Namespaces>(
		ctx: { logger: Logger },
		namespace: Namespace,
		key: string,
		populate: (key: string) => Promise<Namespaces[Namespace]>
	): Promise<Namespaces[Namespace]>;
}

type InMemoryCacheConfig = {
	ttl: number; // the ttl for cache records in milliseconds
};

export class InMemoryCache<Namespaces extends Record<string, unknown>> implements Cache<Namespaces> {
	private readonly cache: Map<string, CacheRecord<Namespaces[keyof Namespaces]>> = new Map();

	constructor(private readonly config: InMemoryCacheConfig) {}

	async get<Namespace extends keyof Namespaces>(namespace: Namespace, key: string): Promise<Namespaces[Namespace] | null> {
		const namespacedKey = `${String(namespace)}:${key}`;

		const res = this.cache.get(namespacedKey) as CacheRecord<Namespaces[Namespace]> | undefined;

		if (!res) return null;

		if (res.expiresAt < Date.now()) {
			this.delete(namespace, key);
			return null;
		}

		return res.value;
	}

	async set<Namespace extends keyof Namespaces>(namespace: Namespace, key: string, value: Namespaces[Namespace]): Promise<void> {
		const namespacedKey = `${String(namespace)}:${key}`;

		this.cache.set(namespacedKey, {
			expiresAt: Date.now() + this.config.ttl,
			value,
		});
	}

	async delete<Namespace extends keyof Namespaces>(namespace: Namespace, key: string): Promise<void> {
		const namespacedKey = `${String(namespace)}:${key}`;

		this.cache.delete(namespacedKey);
	}

	async fetchOrPopulate<Namespace extends keyof Namespaces>(
		ctx: { logger: Logger },
		namespace: Namespace,
		key: string,
		populate: (key: string) => Promise<Namespaces[Namespace]>
	): Promise<Namespaces[Namespace]> {
		const logger = ctx.logger;

		logger.info(`Fetching from cache for ${String(namespace)}:${key}`);

		const cached = await this.get(namespace, key);

		if (cached) {
			logger.info(`Cache hit for ${String(namespace)}:${key}`);
			return cached;
		}

		logger.info(`Cache miss for ${String(namespace)}:${key}. Populating...`);

		const populated = await populate(key);

		await this.set<Namespace>(namespace, key, populated);

		logger.info(`Populated cache for ${String(namespace)}:${key}`);

		return populated;
	}
}
