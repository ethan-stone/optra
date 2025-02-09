import { redirect } from "next/navigation";
import { CreateWorkspace } from "./create-workspace";
import { newLogger } from "@/server/logger";
import { getUser } from "@/server/auth/utils";
import {
  createWorkspace,
  getWorkspaceByTenantId,
} from "@/server/data/workspaces";
import { getKeyManagementService } from "@/server/key-management";

export default async function Onboarding() {
  const logger = newLogger({
    namespace: "/onboarding",
  });

  logger.info("Onboarding page accessed");

  const user = await getUser();

  if (!user) {
    logger.info("No user found. Redirecting to sign-up");
    return redirect("/sign-up");
  }

  logger.info(`User found: ${user.id}. Checking for free workspace`, {
    userId: user.id,
  });

  const freeWorkspace = await getWorkspaceByTenantId(user.id);

  if (!freeWorkspace) {
    logger.info("No free workspace found. Creating one...");

    const keyManagementService = await getKeyManagementService();

    const now = new Date();

    const dek = await keyManagementService.createDataKey();

    await createWorkspace({
      dataEncryptionKeyId: dek.keyId,
      name: "Personal",
      tenantId: user.id,
      type: "free",
      createdAt: now,
      updatedAt: now,
    });

    logger.info("Free workspace created. Redirecting to dashboard");

    return redirect("/dashboard");
  }

  logger.info("Free workspace found. Redirecting to create workspace flow.");

  return (
    <main className="flex min-h-screen flex-col items-center">
      <CreateWorkspace />
    </main>
  );
}
