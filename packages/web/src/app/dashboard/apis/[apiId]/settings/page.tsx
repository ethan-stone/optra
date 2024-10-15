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
      <div className="mb-6 flex flex-col justify-between">
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-sm text-stone-500">
          Update the settings for your API.
        </p>
      </div>
      <SettingsForm
        apiId={api.id}
        apiName={api.name}
        tokenExpirationInSeconds={api.tokenExpirationInSeconds}
      />
    </div>
  );
}
