import { connect } from "@planetscale/database";
import { drizzle } from "drizzle-orm/planetscale-serverless";
import * as schema from "@optra/db/schema";
import { Config } from "sst/node/config";

const connection = connect({
  url: Config.DRIZZLE_DATABASE_URL,
});

export const db = drizzle(connection, {
  schema: schema,
});
