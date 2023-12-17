import { createConnection, Db, PlanetScaleDb } from '@/db';

export let db: Db;

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
