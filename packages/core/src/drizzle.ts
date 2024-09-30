import postgres from "postgres";
import { schema } from ".";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";

let client: postgres.Sql | undefined = undefined;
let db: PostgresJsDatabase<typeof schema> | undefined = undefined;

export async function getDrizzle(dbUrl: string) {
  if (!client) {
    client = postgres(dbUrl, { max: 1, prepare: false });
  }

  if (!db) {
    db = drizzle(client, { schema });
  }

  return { client, db };
}
