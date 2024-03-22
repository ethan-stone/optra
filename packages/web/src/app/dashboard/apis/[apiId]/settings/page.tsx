import { getApiByWorkspaceIdAndApiId } from "@/server/data/apis";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getTenantId } from "@/utils/auth";
import { notFound } from "next/navigation";
import { SettingsForm } from "./settings-form";

type ApiSettingsProps = {
  params: { apiId: string };
};

export default async function Settings(props: ApiSettingsProps) {
  const tenantId = getTenantId();

  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    return notFound();
  }

  const api = await getApiByWorkspaceIdAndApiId(
    workspace.id,
    props.params.apiId,
  );

  if (!api) {
    return notFound();
  }

  return (
    <div className="flex flex-col">
      <SettingsForm
        apiId={api.id}
        apiName={api.name}
        tokenExpirationInSeconds={api.tokenExpirationInSeconds}
      />
    </div>
  );
}
