import { Chance } from "chance";
import * as schema from "@optra/db/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

const chance = new Chance();

type InsertTokenGeneration = typeof schema.tokenGenerations.$inferInsert;

async function main() {
  const dbUrl = process.env.DB_URL;

  if (!dbUrl) {
    throw new Error(`Missing DB_URL env variable`);
  }

  const sql = new Client({
    connectionString: dbUrl,
  });

  await sql.connect();

  const db = drizzle(sql, {
    schema,
  });

  // Generate 100 random workspace IDs
  const workspaceIds = Array.from({ length: 100 }, () => chance.guid());

  // For each workspace, generate 5 random API IDs
  const workspaceApiIds: Record<string, string[]> = {};
  workspaceIds.forEach((workspaceId) => {
    workspaceApiIds[workspaceId] = Array.from({ length: 5 }, () =>
      chance.guid()
    );
  });

  // Generate 100 random client IDs for each API ID
  const apiClientIds: Record<string, string[]> = {};
  Object.values(workspaceApiIds).forEach((apiIds) => {
    apiIds.forEach((apiId) => {
      apiClientIds[apiId] = Array.from({ length: 100 }, () => chance.guid());
    });
  });

  // Generate 1 million data points

  const tokenGenerations: InsertTokenGeneration[] = [];

  for (let i = 0; i < 1000000; i++) {
    const workspaceId = chance.pickone(workspaceIds);
    const apiId = chance.pickone(workspaceApiIds[workspaceId]);
    const clientId = chance.pickone(apiClientIds[apiId]);
    const timestamp = chance.integer({
      min: Date.now() - 1000000000,
      max: Date.now(),
    });

    tokenGenerations.push({
      clientId,
      apiId,
      workspaceId,
      timestamp: new Date(timestamp),
    });
  }

  for (let i = 0; i < tokenGenerations.length; i += 1000) {
    await db
      .insert(schema.tokenGenerations)
      .values(tokenGenerations.slice(i, i + 1000));

    console.log(i + ", " + (i + 1000));
  }

  console.log("Token generations seeded.");

  await sql.end();
}

main();
