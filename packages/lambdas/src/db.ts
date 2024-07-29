import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@optra/db/schema";
import { Resource } from "sst";
import postgres from "postgres";

const connection = postgres(Resource.DbUrl.value);

export const db = drizzle(connection, {
  schema: schema,
});

export { schema };
