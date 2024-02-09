import { db } from "@/server/db";
import { getTenantId } from "@/utils/auth";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const tenantId = getTenantId();

  // TODO: add isNull(deletedAt) to the query once deleting workspaces is implementeds
  const workspace = await db.query.workspaces.findFirst({
    where: (table, { eq, and }) => and(eq(table.tenantId, tenantId)),
  });

  if (!workspace) {
    redirect("/onboarding");
  }

  return redirect("/dashboard/apis");
}
