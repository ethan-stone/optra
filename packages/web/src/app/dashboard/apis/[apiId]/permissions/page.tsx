import { getTenantId } from "@/utils/auth";
import { redirect } from "next/navigation";
import { AddPermissionForm } from "./add-permission-form";
import { PermissionItem } from "./permission-item";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getApiScopes } from "@/server/data/apis";
import { Separator } from "@/components/ui/separator";

type PermissionsProps = {
  params: { apiId: string };
};

export default async function Permissions(props: PermissionsProps) {
  const tenantId = getTenantId();

  // TODO: add isNull(deletedAt) to the query once deleting workspaces is implemented
  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    return redirect("/onboarding");
  }

  // the layout already checks that the api exists and belongs to this tenant/workspace
  const permissions = await getApiScopes(props.params.apiId);

  return (
    <div className="flex flex-col">
      <AddPermissionForm />
      {permissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md">
          <div className="flex flex-col items-center justify-between gap-4 p-4">
            <h1 className="text-2xl font-semibold">No permissions found</h1>
            <p className="text text-stone-500">
              Looks like there are no permissions for this API. Create one to
              get started.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col rounded-md border border-stone-300 bg-stone-50 shadow">
          {permissions.map((p, idx) => {
            return (
              <div key={idx}>
                <PermissionItem {...p} />
                {idx < permissions.length - 1 && <Separator />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
