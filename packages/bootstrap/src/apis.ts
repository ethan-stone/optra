import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DrizzleApiRepo } from "@optra/core/apis";
import { DrizzleSigningSecretRepo } from "@optra/core/signing-secrets";
import { encrypt, generateRandomName } from "./utils";
import { webcrypto } from "crypto";

export async function newApi(
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
    jwksBaseUrl: string;
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
        jwksBaseUrl: args.jwksBaseUrl,
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

export async function newApiScope(
  db: {
    apis: DrizzleApiRepo;
  },
  args: {
    workspaceId: string;
    apiId: string;
    name: string;
    description: string;
  }
) {
  return await db.apis.createScope({
    apiId: args.apiId,
    workspaceId: args.workspaceId,
    name: args.name,
    description: args.description,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
