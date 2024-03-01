import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/server/db";
import { getTenantId } from "@/utils/auth";
import { redirect } from "next/navigation";

// type PermissionItemProps = {
//   id: string;
//   name: string;
//   description: string;
// };

// function PermissionItem(props: PermissionItemProps) {
//   return (
//     <div>
//       {props.id} | {props.name} | {props.description}
//     </div>
//   );
// }

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
  });

  console.log(permissions);

  return (
    <div className="flex flex-col">
      <div className="flex flex-row gap-4">
        <div className="flex flex-grow flex-col gap-1">
          Name
          <Input placeholder="api:create" />
        </div>
        <div className="flex flex-grow flex-col gap-1">
          Description
          <Input placeholder="Create APIs" />
        </div>
        <div className="flex items-end">
          <Button className="flex flex-grow">Create</Button>
        </div>
      </div>
    </div>
  );
}
