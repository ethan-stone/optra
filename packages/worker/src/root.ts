import { createConnection, Db, PlanetScaleDb } from '@/db';
import { TokenBucket } from '@/ratelimit';

export let db: Db;
export const tokenBuckets: Map<string, TokenBucket> = new Map();

let hasInitialized = false;

export function initialize(env: {
	env: 'development' | 'production';
	dbUrl: string;
	axiomToken?: string;
	axiomDataset?: string;
	axiomOrgId?: string;
}) {
	if (hasInitialized) {
		return;
	}

	const conn = createConnection(env.dbUrl);

	db = new PlanetScaleDb(conn);

	hasInitialized = true;
}
