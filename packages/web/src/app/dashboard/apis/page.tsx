import { db } from "@/server/db";
import { getTenantId } from "@/utils/auth";
import { redirect } from "next/navigation";
import { Apis } from "./apis";
import { CreateApi } from "./create-api";

export default async function ApisPage() {
  const tenantId = getTenantId();

  // TODO: add isNull(deletedAt) to the query once deleting workspaces is implemented
  const workspace = await db.query.workspaces.findFirst({
    where: (table, { eq }) => eq(table.tenantId, tenantId),
    with: {
      apis: {
        where: (table, { isNull }) => isNull(table.deletedAt),
      },
    },
  });

  if (!workspace) {
    return redirect("/onboarding");
  }

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex w-1/2 flex-col py-10">
        <div className="flex flex-row justify-between">
          <div>
            <h1 className="flex text-4xl">APIs</h1>
            <p className="py-2 text-stone-500">
              Make APIs that can be consumed from authorized clients
            </p>
          </div>
          <CreateApi />
        </div>
        <Apis data={workspace.apis.map((a) => ({ id: a.id, name: a.name }))} />
      </div>
    </main>
  );
}
