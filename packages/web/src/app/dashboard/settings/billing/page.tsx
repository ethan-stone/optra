import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getTenantId } from "@/utils/auth";
import { redirect } from "next/navigation";
import { Plans } from "./plans";

export default async function Billing() {
  const tenantId = await getTenantId();

  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    return redirect("/sign-in");
  }

  return (
    <div className="flex flex-col">
      <h1 className="text-2xl font-semibold">Billing</h1>
      <div className="flex w-full flex-col items-center justify-center pt-20">
        <Plans
          currentPlan={workspace.billingInfo?.plan ?? "free"}
          hasBillingInfo={!!workspace.billingInfo}
        />
      </div>
    </div>
  );
}
