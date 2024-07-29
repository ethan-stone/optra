import { config } from "dotenv";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

config({
  path: "./.env",
});

async function main() {
  const sql = postgres(process.env.DATABASE_URL as string, { max: 1 });
  const db = drizzle(sql);

  // This will run migrations on the database, skipping the ones already applied
  await migrate(db, { migrationsFolder: "./drizzle" });

  // Don't forget to close the connection, otherwise the script will hang

  await sql.end();
}

main();
