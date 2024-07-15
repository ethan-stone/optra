import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@optra/db/schema";
import { Config } from "sst/node/config";
import postgres from "postgres";

const connection = postgres(Config.DRIZZLE_DATABASE_URL);

export const db = drizzle(connection, {
  schema: schema,
});
