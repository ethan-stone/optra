import { schema } from "@optra/db";
import { connect } from "@planetscale/database";
import { drizzle } from "drizzle-orm/planetscale-serverless";
import { randomUUID, createHash } from "crypto";

function uid() {
  return randomUUID().replace(/-/g, "");
}

function generateRandomName() {
  // Arrays of animals and colors
  const animals = ["Lion", "Tiger", "Bear", "Elephant", "Panther", "Giraffe"];
  const colors = ["Red", "Blue", "Green", "Yellow", "Purple", "Orange"];

  // Randomly select an animal and a color
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const color = colors[Math.floor(Math.random() * colors.length)];

  // Generate a random six-digit number
  const number = Math.floor(Math.random() * 900000) + 100000;

  // Concatenate them to form the name
  return `${color}${animal}${number}`;
}

/**
 * This generates an internal workspace and api that represents optra itself
 */
async function main() {
  const connection = connect({
    url: process.env.DRIZZLE_DATABASE_URL as string,
  });

  const db = drizzle(connection, {
    schema,
  });

  const workspaceId = `ws_` + uid();

  await db.insert(schema.workspaces).values({
    id: workspaceId,
    name: generateRandomName(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const apiId = `api_` + uid();

  await db.insert(schema.apis).values({
    id: apiId,
    name: generateRandomName(),
    workspaceId: workspaceId,
    updatedAt: new Date(),
    createdAt: new Date(),
  });

  console.log({
    OPTRA_WORKSPACE_ID: workspaceId,
    OPTRA_API_ID: apiId,
  });
}

main();
