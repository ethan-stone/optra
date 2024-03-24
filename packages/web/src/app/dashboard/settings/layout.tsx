import { Tabs } from "@/components/ui/navbar";
import { db } from "@/server/db";
import { getTenantId } from "@/utils/auth";
import { redirect } from "next/navigation";
import { type PropsWithChildren } from "react";

type SettingsPageProps = PropsWithChildren;

export default async function SettingsPageLayout(props: SettingsPageProps) {
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

  console.log("SettingsPageLayout");

  if (!workspace) {
    return redirect("/onboarding");
  }

  const tabs = [
    {
      name: "Root Clients",
      href: `/dashboard/settings/root-clients`,
      segment: "root-clients",
    },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex w-1/2 flex-col py-10">
        <h1 className="flex text-4xl">Settings</h1>
        <p className="rounded py-1 text-stone-500">Manage your workspace</p>
        <Tabs tabs={tabs} />
        <main className="relative mb-20 mt-4">{props.children}</main>
      </div>
    </main>
  );
}
