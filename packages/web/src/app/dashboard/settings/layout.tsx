import { Tabs } from "@/components/ui/navbar";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getTenantId } from "@/utils/auth";
import { redirect } from "next/navigation";
import { type PropsWithChildren } from "react";

type SettingsPageProps = PropsWithChildren;

export default async function SettingsPageLayout(props: SettingsPageProps) {
  const tenantId = await getTenantId();

  // TODO: add isNull(deletedAt) to the query once deleting workspaces is implemented
  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    return redirect("/onboarding");
  }

  const tabs = [
    {
      name: "Root Clients",
      href: `/dashboard/settings/root-clients`,
      segment: "root-clients",
    },
    {
      name: "Billing",
      href: `/dashboard/settings/billing`,
      segment: "billing",
    },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex w-2/3 flex-col px-10 py-10">
        <h1 className="flex text-2xl font-semibold">Settings</h1>
        <p className="rounded py-2 text-sm font-light text-stone-500">
          Manage your workspace
        </p>
        <Tabs tabs={tabs} />
        <main className="relative mb-20 mt-4">{props.children}</main>
      </div>
    </main>
  );
}
