import { db } from "@/server/db";
import { keyManagementService } from "@/server/key-management";
import { uid } from "@/utils/uid";
import { auth } from "@clerk/nextjs";
import { schema } from "@optra/db";
import { redirect } from "next/navigation";
import { CreateWorkspace } from "./create-workspace";

export default async function Onboarding() {
  const { userId } = auth();

  if (userId) {
    // TODO: add isNull(deletedAt) to the query once deleting workspaces is implemented
    // find the free workspace for the user
    const freeWorkspace = await db.query.workspaces.findFirst({
      where: (table, { eq, and }) => and(eq(table.tenantId, userId)),
    });

    if (!freeWorkspace) {
      // create the free workspace for the user
      const wsId = uid("ws");
      const dekId = uid("dek");

      const now = new Date();

      const dek = await keyManagementService.generateDataKey();

      await db.transaction(async (tx) => {
        await tx.insert(schema.dataEncryptionKeys).values({
          id: dekId,
          key: Buffer.from(dek.encryptedDataKey).toString("base64"),
          createdAt: now,
        });

        await tx.insert(schema.workspaces).values({
          id: wsId,
          dataEncryptionKeyId: dekId,
          name: "Personal",
          tenantId: userId,
          createdAt: now,
          updatedAt: now,
        });
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
  return redirect("/");
}
