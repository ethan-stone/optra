import { schema } from "@optra/db";
import { PlanetScaleDatabase } from "drizzle-orm/planetscale-serverless";
import { randomBytes, createHash } from "crypto";

function uid() {
  return randomBytes(10).toString("hex");
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
export async function bootstrap(db: PlanetScaleDatabase<typeof schema>) {
  const internalWorkspaceId = `ws_` + uid();

  await db.insert(schema.workspaces).values({
    id: internalWorkspaceId,
    name: generateRandomName(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const internalApiId = `api_` + uid();

  await db.insert(schema.apis).values({
    id: internalApiId,
    name: generateRandomName(),
    workspaceId: internalWorkspaceId,
    updatedAt: new Date(),
    createdAt: new Date(),
  });

  const workspaceId = `ws_` + uid();

  await db.insert(schema.workspaces).values({
    id: workspaceId,
    name: generateRandomName(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const rootClientId = `client_` + uid();
  const rootClientSecretId = `client_secret_` + uid();
  const rootClientSecretValue = uid();
  const rootClientSecretHash = createHash("sha256")
    .update(rootClientSecretValue)
    .digest("hex");

  await db.insert(schema.clients).values({
    id: rootClientId,
    name: generateRandomName(),
    apiId: internalApiId,
    version: 1,
    workspaceId: internalWorkspaceId,
    forWorkspaceId: workspaceId,
    rateLimitBucketSize: 1000,
    rateLimitRefillAmount: 10,
    rateLimitRefillInterval: 10,
    createdAt: new Date(),
  });

  await db.insert(schema.clientSecrets).values({
    id: rootClientSecretId,
    secret: rootClientSecretHash,
    clientId: rootClientId,
    status: "active",
    createdAt: new Date(),
  });

  return {
    OPTRA_WORKSPACE_ID: internalWorkspaceId,
    OPTRA_API_ID: internalApiId,
    WORKSPACE_ID: workspaceId,
    ROOT_CLIENT_ID: rootClientId,
    ROOT_CLIENT_SECRET: rootClientSecretValue,
  };
}
