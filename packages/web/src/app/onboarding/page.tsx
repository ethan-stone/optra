import { redirect } from "next/navigation";
import { CreateWorkspace } from "./create-workspace";
import {
  createWorkspace,
  getWorkspaceByTenantId,
} from "@/server/data/workspaces";
import { getKeyManagementService } from "@/server/key-management";
import { createServerClient } from "@/server/supabase/server-client";

export default async function Onboarding() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // TODO: add isNull(deletedAt) to the query once deleting workspaces is implemented
    // find the free workspace for the user

    const keyManagementService = await getKeyManagementService();

    const freeWorkspace = await getWorkspaceByTenantId(user.id);

    if (!freeWorkspace) {
      // create the free workspace for the user

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

      return redirect("/dashboard");
    }
  }

  // TODO: load component to create a new paid workspace

  return (
    <main className="flex min-h-screen flex-col items-center">
      <CreateWorkspace />
    </main>
  );
}
