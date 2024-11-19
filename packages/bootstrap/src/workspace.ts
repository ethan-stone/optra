import { DrizzleWorkspaceRepo } from "@optra/core/workspaces";
import { AWSKeyManagementService } from "@optra/core/key-management";
import { uid, generateRandomName } from "./utils";

export async function newWorkspace(
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
    type: "free",
    createdAt: new Date(),
    updatedAt: new Date(),
    dataEncryptionKeyId: dataEncryptionKeyId,
  });

  return {
    workspaceId: id,
    dataEncryptionKey: Buffer.from(plaintextKey).toString("base64"),
  };
}
