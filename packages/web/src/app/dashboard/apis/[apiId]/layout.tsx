import { Tabs } from "@/components/ui/navbar";
import { getApiByWorkspaceIdAndApiId } from "@/server/data/apis";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getTenantId } from "@/utils/auth";
import { notFound, redirect } from "next/navigation";
import { type PropsWithChildren } from "react";

type ApiPageProps = PropsWithChildren<{
  params: { apiId: string };
}>;

export default async function ApiPageLayout(props: ApiPageProps) {
  const tenantId = getTenantId();

  // TODO: add isNull(deletedAt) to the query once deleting workspaces is implemented

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

  const tabs = [
    {
      name: "Overview",
      href: `/dashboard/apis/${api.id}/overview`,
      segment: "overview",
    },
    {
      name: "Clients",
      href: `/dashboard/apis/${api.id}/clients`,
      segment: "clients",
    },
    {
      name: "Settings",
      href: `/dashboard/apis/${api.id}/settings`,
      segment: "settings",
    },
    {
      name: "Permissions",
      href: `/dashboard/apis/${api.id}/permissions`,
      segment: "permissions",
    },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex w-1/2 flex-col py-10">
        <h1 className="flex text-4xl">{api.name}</h1>
        <p className="w-min rounded bg-stone-200 px-2 py-1 font-mono font-thin">
          {api.id}
        </p>
        <Tabs tabs={tabs} />
        <main className="relative mb-20 mt-8 ">{props.children}</main>
      </div>
    </main>
  );
}
