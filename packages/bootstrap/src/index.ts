import { schema } from "../../core/src";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { randomBytes, createHash, webcrypto } from "crypto";
import { GenerateDataKeyCommand, KMSClient } from "@aws-sdk/client-kms";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getDrizzle } from "@optra/core/drizzle";
import { DrizzleWorkspaceRepo } from "@optra/core/workspaces";
import { DrizzleApiRepo } from "@optra/core/apis";
import { DrizzleClientRepo } from "@optra/core/clients";
import { DrizzleClientSecretRepo } from "@optra/core/client-secrets";
import { DrizzleSigningSecretRepo } from "@optra/core/signing-secrets";
import { AWSKeyManagementService } from "@optra/core/key-management";

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

export function generateJsonObject(numKeys: number): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  for (let i = 0; i < numKeys; i++) {
    obj[`key-${i}`] = `value-${i}`;
  }

  return obj;
}

const defaultInternalWorkspaceScopes = [
  {
    name: "api:read_api:*",
    description: "Able to read all APIs in the workspace",
  },
  {
    name: "api:create_api:*",
    description: "Able to create APIs in the workspace",
  },
  {
    name: "api:update_api:*",
    description: "Able to update all APIs in the workspace",
  },
  {
    name: "api:delete_api:*",
    description: "Able to delete all APIs in the workspace",
  },
  {
    name: "api:read_client:*",
    description: "Able to read all clients in the workspace",
  },
  {
    name: "api:create_client:*",
    description: "Able to create clients in the workspace",
  },
  {
    name: "api:update_client:*",
    description: "Able to update all clients in the workspace",
  },
  {
    name: "api:delete_client:*",
    description: "Able to delete all clients in the workspace",
  },
];

async function newWorkspace(
  db: PostgresJsDatabase<typeof schema>,
  kmsClient: KMSClient,
  awsKMSKeyArn: string,
  internal = false
) {
  const workspaceId = `ws_` + uid();

  const { CiphertextBlob, Plaintext } = await kmsClient.send(
    new GenerateDataKeyCommand({
      KeyId: awsKMSKeyArn,
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
    tenantId: uid(),
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
  db: {
    apis: DrizzleApiRepo;
    signingSecrets: DrizzleSigningSecretRepo;
  },
  s3Client: S3Client,
  args: {
    workspaceId: string;
    dataEncryptionKey: string;
    algorithm: "hsa256" | "rsa256";
    bucketName: string;
  }
) {
  const apiName = generateRandomName();

  let apiId: string;

  switch (args.algorithm) {
    case "hsa256": {
      const signingSecret = await webcrypto.subtle.generateKey(
        {
          name: "HMAC",
          hash: { name: "SHA-256" },
        },
        true,
        ["sign", "verify"]
      );

      const exportedSigningSecret = Buffer.from(
        await webcrypto.subtle.exportKey("raw", signingSecret)
      ).toString("base64");

      const { encryptedData, iv } = await encrypt(
        Buffer.from(exportedSigningSecret, "base64"),
        Buffer.from(args.dataEncryptionKey, "base64")
      );

      const { id } = await db.apis.create({
        name: apiName,
        workspaceId: args.workspaceId,
        algorithm: "rsa256",
        encryptedSigningSecret: Buffer.from(encryptedData).toString("base64"),
        iv: Buffer.from(iv).toString("base64"),
        tokenExpirationInSeconds: 84600,
        updatedAt: new Date(),
        createdAt: new Date(),
      });

      await db.apis.createScope({
        apiId: id,
        name: "example-scope",
        description: "Just an example scope",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      apiId = id;

      break;
    }

    case "rsa256": {
      const keyPair = await webcrypto.subtle.generateKey(
        {
          name: "RSASSA-PKCS1-v1_5",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: { name: "SHA-256" },
        },
        true,
        ["sign", "verify"]
      );

      const publicKey = await webcrypto.subtle.exportKey(
        "jwk",
        keyPair.publicKey
      );

      const privateKey = await webcrypto.subtle.exportKey(
        "pkcs8",
        keyPair.privateKey
      );

      const { encryptedData, iv } = await encrypt(
        Buffer.from(privateKey),
        Buffer.from(args.dataEncryptionKey, "base64")
      );

      const { id, currentSigningSecretId } = await db.apis.create({
        name: apiName,
        workspaceId: args.workspaceId,
        algorithm: "rsa256",
        encryptedSigningSecret: Buffer.from(encryptedData).toString("base64"),
        iv: Buffer.from(iv).toString("base64"),
        tokenExpirationInSeconds: 84600,
        updatedAt: new Date(),
        createdAt: new Date(),
      });

      apiId = id;

      await db.apis.createScope({
        apiId: id,
        name: "example-scope",
        description: "Just an example scope",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await s3Client.send(
        new PutObjectCommand({
          Bucket: args.bucketName,
          Key: `${args.workspaceId}/${apiId}/.well-known/jwks.json`,
          Body: JSON.stringify({
            keys: [{ ...publicKey, kid: currentSigningSecretId }],
          }),
          ContentType: "application/json",
        })
      );

      break;
    }
  }

  return { apiId };
}

async function newApiScope(
  db: PostgresJsDatabase<typeof schema>,
  args: {
    apiId: string;
    workspaceId: string;
    name: string;
    description: string;
  }
) {
  const id = `api_scope_` + uid();

  await db.insert(schema.apiScopes).values({
    id,
    apiId: args.apiId,
    name: args.name,
    description: args.description,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function newClient(
  db: PostgresJsDatabase<typeof schema>,
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
  const clientSecretId = `csk_` + uid();
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
    currentClientSecretId: clientSecretId,
    rateLimitBucketSize: args.rateLimitBucketSize ?? 1000,
    rateLimitRefillAmount: args.rateLimitRefillAmount ?? 10,
    rateLimitRefillInterval: args.rateLimitRefillInterval ?? 10,
    metadata: generateJsonObject(10),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(schema.clientSecrets).values({
    id: clientSecretId,
    secret: clientSecretHash,
    status: "active",
    createdAt: new Date(),
  });

  return { clientId, clientSecretId, clientSecretValue };
}

/**
 * This generates an internal workspace and api that represents optra itself
 */
export async function bootstrap(
  dbUrl: string,
  db: PostgresJsDatabase<typeof schema>,
  kmsClient: KMSClient,
  s3Client: S3Client,
  awsKMSKeyArn: string,
  bucketName: string
) {
  const { db: drizzleClient } = await getDrizzle(dbUrl);
  const workspaces = new DrizzleWorkspaceRepo(drizzleClient);
  const apis = new DrizzleApiRepo(drizzleClient);
  const clients = new DrizzleClientRepo(drizzleClient);
  const clientSecrets = new DrizzleClientSecretRepo(drizzleClient);
  const signingSecrets = new DrizzleSigningSecretRepo(drizzleClient);

  const keyManager = new AWSKeyManagementService(
    kmsClient,
    drizzleClient,
    awsKMSKeyArn
  );

  const { keyId: dataEncryptionKeyId, plaintextKey } =
    await keyManager.createDataKey();

  const { id: internalWorkspaceId } = await workspaces.create({
    name: "Optra",
    tenantId: "optra",
    createdAt: new Date(),
    updatedAt: new Date(),
    dataEncryptionKeyId: dataEncryptionKeyId,
  });

  const { apiId: internalApiId } = await newApi(
    {
      apis: apis,
      signingSecrets: signingSecrets,
    },
    s3Client,
    {
      workspaceId: internalWorkspaceId,
      dataEncryptionKey: Buffer.from(plaintextKey).toString("base64"),
      algorithm: "rsa256",
      bucketName,
    }
  );

  const { workspaceId, dataEncryptionKey } = await newWorkspace(
    db,
    kmsClient,
    awsKMSKeyArn
  );

  const { workspaceId: otherWorkspaceId } = await newWorkspace(
    db,
    kmsClient,
    awsKMSKeyArn
  );

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

  const { apiId } = await newApi(
    {
      apis: apis,
      signingSecrets: signingSecrets,
    },
    s3Client,
    {
      workspaceId,
      dataEncryptionKey: dataEncryptionKey,
      algorithm: "rsa256",
      bucketName,
    }
  );

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
    rateLimitRefillInterval: 3000,
  });

  const {
    clientId: basicClientIdForRotating,
    clientSecretValue: basicClientSecretValueForRotating,
  } = await newClient(db, {
    apiId,
    workspaceId,
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
    BASIC_CLIENT_ID_FOR_ROTATING: basicClientIdForRotating,
    BASIC_CLIENT_SECRET_FOR_ROTATING: basicClientSecretValueForRotating,
  };
}
