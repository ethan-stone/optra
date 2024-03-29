import { db } from "@/server/db";
import { getTenantId } from "@/utils/auth";
import { redirect } from "next/navigation";
import { AddPermissionForm } from "./add-permission-form";
import { PermissionItem } from "./permission-item";

type PermissionsProps = {
  params: { apiId: string };
};

export default async function Permissions(props: PermissionsProps) {
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

  // the layout already checks that the api exists and belongs to this tenant/workspace
  const permissions = await db.query.apiScopes.findMany({
    where: (table, { eq }) => eq(table.apiId, props.params.apiId),
    orderBy: (table, { desc }) => desc(table.createdAt),
  });

  return (
    <div className="flex flex-col">
      <AddPermissionForm />
      {permissions.map((p, idx) => {
        return <PermissionItem key={idx} {...p} />;
      })}
    </div>
  );
}
