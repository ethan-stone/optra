import { createConnection } from '@/db';

export let db: ReturnType<typeof createConnection>;

let hasInitialized = false;

export function initialize(env: { dbUrl: string }) {
	if (hasInitialized) {
		return;
	}

	db = createConnection(env.dbUrl);

	hasInitialized = true;
}
