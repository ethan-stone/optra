import { Client } from "pg";
import { schema } from ".";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";

let client: Client | undefined = undefined;
let db: NodePgDatabase<typeof schema> | undefined = undefined;

export async function getDrizzle(dbUrl: string) {
  if (!client) {
    client = new Client({
      connectionString: dbUrl,
    });

    await client.connect();
  }

  if (!db) {
    db = drizzle(client, { schema });
  }

  return { client, db };
}
