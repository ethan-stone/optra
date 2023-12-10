import { schema } from "@optra/db";
import { bootstrap } from "./index";
import { connect } from "@planetscale/database";
import { drizzle } from "drizzle-orm/planetscale-serverless";

async function main() {
  const connection = connect({
    url: process.env.DRIZZLE_DATABASE_URL!,
  });

  const db = drizzle(connection, {
    schema: schema,
  });

  const data = await bootstrap(db);

  console.log(data);
}

main();
