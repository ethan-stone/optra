import { db } from "@/server/db";
import { getTenantId } from "@/utils/auth";
import { notFound, redirect } from "next/navigation";

type ApiPageProps = {
  params: { apiId: string };
};

export default async function Api(props: ApiPageProps) {
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

  const api = await db.query.apis.findFirst({
    where: (table, { eq, and }) =>
      and(
        eq(table.workspaceId, workspace.id),
        eq(table.id, props.params.apiId),
      ),
  });

  if (!api) {
    return notFound();
  }

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex w-1/2 flex-col py-10">
        <h1 className="flex text-4xl">{api.name}</h1>
      </div>
    </main>
  );
}
