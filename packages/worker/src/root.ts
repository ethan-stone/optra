import { createConnection, Db, PlanetScaleDb } from '@/db';
import { Logger } from './logger';

export let db: Db;
export let logger: Logger;

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

	if (env.env === 'production' && (!env.axiomToken || !env.axiomDataset || !env.axiomOrgId)) {
		throw new Error('Missing Axiom environment variables for production');
	}

	if (env.env === 'production' && env.axiomToken && env.axiomDataset && env.axiomOrgId) {
		logger = new Logger({
			env: env.env,
			axiomToken: env.axiomToken,
			axiomDataset: env.axiomDataset,
			axiomOrgId: env.axiomOrgId,
		});
	} else {
		logger = new Logger({
			env: 'development',
		});
	}

	hasInitialized = true;
}
