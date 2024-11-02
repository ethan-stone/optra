import { getTenantId } from "@/utils/auth";
import { NewClientForm } from "./new-client-form";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { notFound, redirect } from "next/navigation";
import {
  getApiByWorkspaceIdAndApiId,
  getScopesForApi,
} from "@/server/data/apis";

type PageProps = {
  params: { apiId: string };
};

export default async function NewClient(props: PageProps) {
  const tenantId = await getTenantId();

  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    return redirect("/onboarding");
  }

  const api = await getApiByWorkspaceIdAndApiId(
    workspace.id,
    props.params.apiId,
  );

  if (!api) {
    return notFound();
  }

  const scopes = await getScopesForApi(api.id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center justify-between">
        <h2 className="text-2xl font-semibold">New Client</h2>
      </div>
      <NewClientForm
        scopes={scopes.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
        }))}
      />
    </div>
  );
}
