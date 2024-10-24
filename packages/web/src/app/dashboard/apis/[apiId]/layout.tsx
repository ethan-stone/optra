import { Tabs } from "@/components/ui/navbar";
import { getApiByWorkspaceIdAndApiId } from "@/server/data/apis";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getTenantId } from "@/utils/auth";
import { notFound, redirect } from "next/navigation";
import { type PropsWithChildren } from "react";
import { CopyApiId } from "./copy-api-id";
import { Breadcrumbs } from "./breadcrumbs";

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

  console.log();

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex w-2/3 flex-col px-10 py-10">
        <Breadcrumbs />
        <h1 className="mt-4 flex text-2xl font-semibold">{api.name}</h1>
        <CopyApiId id={api.id} />
        <Tabs tabs={tabs} />
        <main className="relative mb-20 mt-8">{props.children}</main>
      </div>
    </main>
  );
}
