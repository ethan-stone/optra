import { schema } from "@optra/db";
import { bootstrap } from "./index";
import { connect } from "@planetscale/database";
import { drizzle } from "drizzle-orm/planetscale-serverless";

function format(obj: Record<string, any>): string {
  return Object.entries(obj)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

async function main() {
  const connection = connect({
    url: process.env.DRIZZLE_DATABASE_URL!,
  });

  const db = drizzle(connection, {
    schema: schema,
  });

  const data = await bootstrap(db);

  console.log(format(data));
}

main();
