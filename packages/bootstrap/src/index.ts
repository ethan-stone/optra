import { schema } from "@optra/db";
import { PlanetScaleDatabase } from "drizzle-orm/planetscale-serverless";
import { randomBytes, createHash, createCipheriv, webcrypto } from "crypto";
import { GenerateDataKeyCommand, KMSClient } from "@aws-sdk/client-kms";

const kmsClient = new KMSClient({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  region: "us-east-1",
});

function uid() {
  return randomBytes(10).toString("hex");
}

async function encrypt(text: Uint8Array, key: Uint8Array) {
  const iv = webcrypto.getRandomValues(new Uint8Array(16));

  const importedKey = await crypto.subtle.importKey(
    "raw",
    key,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"]
  );

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    importedKey,
    text
  );

  return { iv, encryptedData: new Uint8Array(encryptedData) };
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

async function newWorkspace(db: PlanetScaleDatabase<typeof schema>) {
  const workspaceId = `ws_` + uid();

  const { CiphertextBlob, Plaintext } = await kmsClient.send(
    new GenerateDataKeyCommand({
      KeyId: process.env.AWS_KMS_KEY_ARN!,
      KeySpec: "AES_256",
    })
  );

  const dataEncryptionKeyId = `dek_` + uid();

  await db.insert(schema.dataEncryptionKeys).values({
    id: dataEncryptionKeyId,
    key: Buffer.from(CiphertextBlob!).toString("base64"),
    createdAt: new Date(),
  });

  await db.insert(schema.workspaces).values({
    id: workspaceId,
    dataEncryptionKeyId: dataEncryptionKeyId,
    name: generateRandomName(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    workspaceId,
    dataEncryptionKey: Buffer.from(Plaintext!).toString("base64"),
  };
}

async function newApi(
  db: PlanetScaleDatabase<typeof schema>,
  args: { workspaceId: string; dataEncryptionKey: string }
) {
  const apiId = `api_` + uid();

  const signingSecretId = `signing_secret_` + uid();

  const signingSecretPlain = webcrypto.getRandomValues(new Uint8Array(32));

  const { encryptedData, iv } = await encrypt(
    signingSecretPlain,
    Buffer.from(args.dataEncryptionKey, "base64")
  );

  await db.insert(schema.signingSecrets).values({
    id: signingSecretId,
    secret: Buffer.from(encryptedData).toString("base64"),
    iv: Buffer.from(iv).toString("base64"),
    algorithm: "hsa256",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(schema.apis).values({
    id: apiId,
    name: generateRandomName(),
    signingSecretId: signingSecretId,
    workspaceId: args.workspaceId,
    updatedAt: new Date(),
    createdAt: new Date(),
  });

  return { apiId };
}

async function newClient(
  db: PlanetScaleDatabase<typeof schema>,
  args: {
    workspaceId: string;
    forWorkspaceId?: string;
    apiId: string;
    rateLimitBucketSize?: number;
    rateLimitRefillAmount?: number;
    rateLimitRefillInterval?: number;
  }
) {
  const clientId = `client_` + uid();
  const clientSecretId = `client_secret_` + uid();
  const clientSecretValue = uid();
  const clientSecretHash = createHash("sha256")
    .update(clientSecretValue)
    .digest("hex");

  await db.insert(schema.clients).values({
    id: clientId,
    name: generateRandomName(),
    apiId: args.apiId,
    version: 1,
    workspaceId: args.workspaceId,
    forWorkspaceId: args.forWorkspaceId,
    rateLimitBucketSize: args.rateLimitBucketSize ?? 1000,
    rateLimitRefillAmount: args.rateLimitRefillAmount ?? 10,
    rateLimitRefillInterval: args.rateLimitRefillInterval ?? 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(schema.clientSecrets).values({
    id: clientSecretId,
    clientId: clientId,
    secret: clientSecretHash,
    status: "active",
    createdAt: new Date(),
  });

  return { clientId, clientSecretId, clientSecretValue };
}

/**
 * This generates an internal workspace and api that represents optra itself
 */
export async function bootstrap(db: PlanetScaleDatabase<typeof schema>) {
  const {
    workspaceId: internalWorkspaceId,
    dataEncryptionKey: internalDataEncryptionKey,
  } = await newWorkspace(db);

  const { apiId: internalApiId } = await newApi(db, {
    workspaceId: internalWorkspaceId,
    dataEncryptionKey: internalDataEncryptionKey,
  });

  const { workspaceId, dataEncryptionKey } = await newWorkspace(db);

  const {
    workspaceId: otherWorkspaceId,
    dataEncryptionKey: otherDataEncryptionKey,
  } = await newWorkspace(db);

  const { clientId: rootClientId, clientSecretValue: rootClientSecretValue } =
    await newClient(db, {
      apiId: internalApiId,
      workspaceId: internalWorkspaceId,
      forWorkspaceId: workspaceId,
    });

  const {
    clientId: otherRootClientId,
    clientSecretValue: otherRootClientSecretValue,
  } = await newClient(db, {
    apiId: internalApiId,
    workspaceId: internalWorkspaceId,
    forWorkspaceId: otherWorkspaceId,
  });

  const { apiId } = await newApi(db, {
    workspaceId,
    dataEncryptionKey: dataEncryptionKey,
  });

  const { clientId: basicClientId, clientSecretValue: basicClientSecretValue } =
    await newClient(db, {
      apiId,
      workspaceId,
    });

  const {
    clientId: basicClientIdWithLowRateLimit,
    clientSecretValue: basicClientSecretValueWithLowRateLimit,
  } = await newClient(db, {
    apiId,
    workspaceId,
    rateLimitBucketSize: 3,
    rateLimitRefillAmount: 1,
    rateLimitRefillInterval: 333,
  });

  return {
    OPTRA_WORKSPACE_ID: internalWorkspaceId,
    OPTRA_API_ID: internalApiId,
    WORKSPACE_ID: workspaceId,
    ROOT_CLIENT_ID: rootClientId,
    ROOT_CLIENT_SECRET: rootClientSecretValue,
    OTHER_WORKSPACE_ID: otherWorkspaceId,
    OTHER_ROOT_CLIENT_ID: otherRootClientId,
    OTHER_ROOT_CLIENT_SECRET: otherRootClientSecretValue,
    API_ID: apiId,
    BASIC_CLIENT_ID: basicClientId,
    BASIC_CLIENT_SECRET: basicClientSecretValue,
    BASIC_CLIENT_ID_WITH_LOW_RATELIMIT: basicClientIdWithLowRateLimit,
    BASIC_CLIENT_SECRET_WITH_LOW_RATELIMIT:
      basicClientSecretValueWithLowRateLimit,
  };
}
