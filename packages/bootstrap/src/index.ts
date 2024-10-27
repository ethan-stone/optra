import { schema } from "../../core/src";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { randomBytes, webcrypto } from "crypto";
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
  db: {
    workspaces: DrizzleWorkspaceRepo;
  },
  keyManager: AWSKeyManagementService
) {
  const { keyId: dataEncryptionKeyId, plaintextKey } =
    await keyManager.createDataKey();

  const { id } = await db.workspaces.create({
    name: generateRandomName(),
    tenantId: uid(),
    createdAt: new Date(),
    updatedAt: new Date(),
    dataEncryptionKeyId: dataEncryptionKeyId,
  });

  return {
    workspaceId: id,
    dataEncryptionKey: Buffer.from(plaintextKey).toString("base64"),
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
        workspaceId: args.workspaceId,
        description: "Just an example scope",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.apis.createScope({
        apiId: id,
        name: "another-example-scope",
        workspaceId: args.workspaceId,
        description: "Just another example scope",
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

      const { id, currentSigningSecret } = await db.apis.create({
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
        workspaceId: args.workspaceId,
        name: "example-scope",
        description: "Just an example scope",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.apis.createScope({
        apiId: id,
        workspaceId: args.workspaceId,
        name: "another-example-scope",
        description: "Just another example scope",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await s3Client.send(
        new PutObjectCommand({
          Bucket: args.bucketName,
          Key: `jwks/${args.workspaceId}/${apiId}/.well-known/jwks.json`,
          Body: JSON.stringify({
            keys: [{ ...publicKey, kid: currentSigningSecret.id }],
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
    workspaceId: args.workspaceId,
    name: args.name,
    description: args.description,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function newClient(
  db: {
    clients: DrizzleClientRepo;
    clientSecrets: DrizzleClientSecretRepo;
  },
  args: {
    workspaceId: string;
    forWorkspaceId?: string;
    apiId: string;
    rateLimitBucketSize?: number;
    rateLimitRefillAmount?: number;
    rateLimitRefillInterval?: number;
  }
) {
  let clientId: string;
  let clientSecretValue: string;

  if (args.forWorkspaceId) {
    const { id, secret } = await db.clients.createRoot({
      name: generateRandomName(),
      apiId: args.apiId,
      version: 1,
      workspaceId: args.workspaceId,
      forWorkspaceId: args.forWorkspaceId,
      rateLimitBucketSize: args.rateLimitBucketSize ?? 1000,
      rateLimitRefillAmount: args.rateLimitRefillAmount ?? 10,
      rateLimitRefillInterval: args.rateLimitRefillInterval ?? 10,
      metadata: generateJsonObject(10),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    clientId = id;
    clientSecretValue = secret;
  } else {
    const { id, secret } = await db.clients.createBasic({
      name: generateRandomName(),
      apiId: args.apiId,
      version: 1,
      workspaceId: args.workspaceId,
      rateLimitBucketSize: args.rateLimitBucketSize ?? 1000,
      rateLimitRefillAmount: args.rateLimitRefillAmount ?? 10,
      rateLimitRefillInterval: args.rateLimitRefillInterval ?? 10,
      metadata: generateJsonObject(10),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    clientId = id;
    clientSecretValue = secret;
  }

  return { clientId, clientSecretValue };
}

/**
 * This generates an internal workspace and api that represents optra itself
 */
export async function bootstrap(
  dbUrl: string,
  accessKeyId: string,
  secretAccessKey: string,
  awsKMSKeyArn: string,
  bucketName: string
) {
  console.log("Starting bootstrap process...");

  const { db: drizzleClient, client } = await getDrizzle(dbUrl);
  const workspaces = new DrizzleWorkspaceRepo(drizzleClient);
  const apis = new DrizzleApiRepo(drizzleClient);
  const clients = new DrizzleClientRepo(drizzleClient);
  const clientSecrets = new DrizzleClientSecretRepo(drizzleClient);
  const signingSecrets = new DrizzleSigningSecretRepo(drizzleClient);

  const s3Client = new S3Client({
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const keyManager = new AWSKeyManagementService(
    drizzleClient,
    awsKMSKeyArn,
    "us-east-1",
    accessKeyId,
    secretAccessKey
  );

  console.log("Creating internal workspace...");
  const {
    workspaceId: internalWorkspaceId,
    dataEncryptionKey: internalDataEncryptionKey,
  } = await newWorkspace(
    {
      workspaces: workspaces,
    },
    keyManager
  );
  console.log(`Internal workspace created with ID: ${internalWorkspaceId}`);

  console.log("Creating internal API...");
  const { apiId: internalApiId } = await newApi(
    {
      apis: apis,
      signingSecrets: signingSecrets,
    },
    s3Client,
    {
      workspaceId: internalWorkspaceId,
      dataEncryptionKey: internalDataEncryptionKey,
      algorithm: "rsa256",
      bucketName,
    }
  );
  console.log(`Internal API created with ID: ${internalApiId}`);

  console.log("Creating main workspace...");
  const { workspaceId, dataEncryptionKey } = await newWorkspace(
    {
      workspaces: workspaces,
    },
    keyManager
  );
  console.log(`Main workspace created with ID: ${workspaceId}`);

  console.log("Creating other workspace...");
  const { workspaceId: otherWorkspaceId } = await newWorkspace(
    {
      workspaces: workspaces,
    },
    keyManager
  );
  console.log(`Other workspace created with ID: ${otherWorkspaceId}`);

  console.log("Creating root client for main workspace...");
  const { clientId: rootClientId, clientSecretValue: rootClientSecretValue } =
    await newClient(
      {
        clients: clients,
        clientSecrets: clientSecrets,
      },
      {
        apiId: internalApiId,
        workspaceId: internalWorkspaceId,
        forWorkspaceId: workspaceId,
      }
    );
  console.log(`Root client created with ID: ${rootClientId}`);

  console.log("Creating other root client for other workspace...");
  const {
    clientId: otherRootClientId,
    clientSecretValue: otherRootClientSecretValue,
  } = await newClient(
    {
      clients: clients,
      clientSecrets: clientSecrets,
    },
    {
      apiId: internalApiId,
      workspaceId: internalWorkspaceId,
      forWorkspaceId: otherWorkspaceId,
    }
  );
  console.log(`Other root client created with ID: ${otherRootClientId}`);

  console.log("Creating API for main workspace...");
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
  console.log(`API created with ID: ${apiId}`);

  console.log("Creating basic client...");
  const { clientId: basicClientId, clientSecretValue: basicClientSecretValue } =
    await newClient(
      {
        clients: clients,
        clientSecrets: clientSecrets,
      },
      {
        apiId,
        workspaceId,
      }
    );
  console.log(`Basic client created with ID: ${basicClientId}`);

  console.log("Creating basic client with low rate limit...");
  const {
    clientId: basicClientIdWithLowRateLimit,
    clientSecretValue: basicClientSecretValueWithLowRateLimit,
  } = await newClient(
    {
      clients: clients,
      clientSecrets: clientSecrets,
    },
    {
      apiId,
      workspaceId,
      rateLimitBucketSize: 3,
      rateLimitRefillAmount: 1,
      rateLimitRefillInterval: 3000,
    }
  );
  console.log(
    `Basic client with low rate limit created with ID: ${basicClientIdWithLowRateLimit}`
  );

  console.log("Creating basic client with rotating secret...");
  const {
    clientId: basicClientIdForRotating,
    clientSecretValue: basicClientSecretValueForRotating,
  } = await newClient(
    {
      clients: clients,
      clientSecrets: clientSecrets,
    },
    {
      apiId,
      workspaceId,
    }
  );
  console.log(
    `Basic client with rotating secret created with ID: ${basicClientIdForRotating}`
  );

  await client.end();
  console.log("Bootstrap process completed successfully.");

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
