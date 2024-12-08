import { redirect } from "next/navigation";
import { CreateWorkspace } from "./create-workspace";
import {
  createWorkspace,
  getWorkspaceByTenantId,
} from "@/server/data/workspaces";
import { getKeyManagementService } from "@/server/key-management";
import { createServerClient } from "@/server/supabase/server-client";
import { newLogger } from "@/server/logger";

export default async function Onboarding() {
  const logger = newLogger({
    namespace: "/onboarding",
  });

  logger.info("Onboarding page accessed");

  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.info("No user found. Redirecting to sign-up");
    return redirect("/sign-up");
  }

  logger.info(`User found: ${user.id}. Checking for free workspace`, {
    userId: user.id,
  });

  // TODO: add isNull(deletedAt) to the query once deleting workspaces is implemented
  // find the free workspace for the user

  const keyManagementService = await getKeyManagementService();

  const freeWorkspace = await getWorkspaceByTenantId(user.id);

  if (!freeWorkspace) {
    // create the free workspace for the user

    logger.info(`No free workspace found for user: ${user.id}. Creating...`, {
      userId: user.id,
    });

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

    logger.info(
      `Created free workspace for user: ${user.id}. Redirecting to dashboard.`,
      {
        userId: user.id,
      },
    );

    return redirect("/dashboard");
  }

  // TODO: load component to create a new paid workspace

  return (
    <main className="flex min-h-screen flex-col items-center">
      <CreateWorkspace />
    </main>
  );
}
