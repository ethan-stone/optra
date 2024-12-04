import { S3Client } from "@aws-sdk/client-s3";
import { getDrizzle } from "@optra/core/drizzle";
import { DrizzleWorkspaceRepo } from "@optra/core/workspaces";
import { DrizzleApiRepo } from "@optra/core/apis";
import { DrizzleClientRepo } from "@optra/core/clients";
import { DrizzleClientSecretRepo } from "@optra/core/client-secrets";
import { DrizzleSigningSecretRepo } from "@optra/core/signing-secrets";
import { AWSKeyManagementService } from "@optra/core/key-management";
import { newApi, newApiScope } from "./apis";
import { newClient } from "./clients";
import { newWorkspace } from "./workspace";

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

/**
 * This generates an internal workspace and api that represents optra itself
 */
export async function bootstrap(
  dbUrl: string,
  accessKeyId: string,
  secretAccessKey: string,
  awsKMSKeyArn: string,
  bucketName: string,
  jwksBaseUrl: string
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
      jwksBaseUrl,
    }
  );
  console.log(`Internal API created with ID: ${internalApiId}`);

  console.log("Creating internal API scopes...");

  const workspaceLevelApiScopeIds: string[] = [];

  for (const scope of defaultInternalWorkspaceScopes) {
    const apiScope = await newApiScope(
      {
        apis: apis,
      },
      {
        apiId: internalApiId,
        workspaceId: internalWorkspaceId,
        ...scope,
      }
    );
    workspaceLevelApiScopeIds.push(apiScope.id);
  }

  console.log("Internal API scopes created successfully.");

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
        apiScopeIds: workspaceLevelApiScopeIds,
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
      apiScopeIds: workspaceLevelApiScopeIds,
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
      jwksBaseUrl,
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
