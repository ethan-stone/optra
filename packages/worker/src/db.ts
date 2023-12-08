import { schema } from '@optra/db';
import { connect } from '@planetscale/database';
import { drizzle } from 'drizzle-orm/planetscale-serverless';

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

export * from 'drizzle-orm';
export * from '@optra/db';
