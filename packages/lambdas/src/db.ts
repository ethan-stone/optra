import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@optra/db/schema";
import { Config } from "sst/node/config";
import { createClient } from "@libsql/client";

const connection = createClient({
  url: Config.DRIZZLE_DATABASE_URL,
  //  authToken: Config.DRIZZLE_AUTH_TOKEN,
});

export const db = drizzle(connection, {
  schema: schema,
});
