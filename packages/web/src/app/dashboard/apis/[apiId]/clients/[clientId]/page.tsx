import { Separator } from "@/components/ui/separator";
import {
  getGenerations,
  getGenerationsGroupedByDay,
  getVerifications,
  getVerificationsGroupedByDay,
} from "@/server/data/analytics";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getTenantId } from "@/server/auth/utils";
import { notFound, redirect } from "next/navigation";
import { TokenVerificationsChart } from "@/components/ui/token-verifications-chart";
import { TokenGenerationsChart } from "@/components/ui/token-generations-chart";
import { getClientByWorkspaceIdAndClientId } from "@/server/data/clients";
import Link from "next/link";
import { Settings } from "lucide-react";
import { DateRangeSelector } from "@/components/ui/time-range-selector";

type ClientPageProps = {
  params: { apiId: string; clientId: string };
  searchParams: {
    timePeriod?: "1m" | "3m" | "6m";
  };
};

export default async function ClientPage(props: ClientPageProps) {
  const tenantId = await getTenantId();

  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    return redirect("/onboarding");
  }

  const client = await getClientByWorkspaceIdAndClientId(
    workspace.id,
    props.params.clientId,
  );

  if (!client) {
    return notFound();
  }

  const timePeriod = props.searchParams.timePeriod ?? "1m";

  const startDate = new Date();
  switch (timePeriod) {
    case "3m":
      startDate.setUTCMonth(startDate.getUTCMonth() - 3);
      break;
    case "6m":
      startDate.setUTCMonth(startDate.getUTCMonth() - 6);
      break;
    default: // "1m"
      startDate.setUTCMonth(startDate.getUTCMonth() - 1);
  }

  const [generations, verifications, generationsByMonth, verificationsByMonth] =
    await Promise.all([
      getGenerations({
        workspaceId: workspace.id,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        apiId: props.params.apiId,
        clientId: props.params.clientId,
      }),
      getVerifications({
        workspaceId: workspace.id,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        apiId: props.params.apiId,
        clientId: props.params.clientId,
      }),
      getGenerationsGroupedByDay({
        workspaceId: workspace.id,
        apiId: props.params.apiId,
        clientId: props.params.clientId,
        timestampGt: startDate,
        timestampLt: new Date(),
      }),
      getVerificationsGroupedByDay({
        workspaceId: workspace.id,
        apiId: props.params.apiId,
        clientId: props.params.clientId,
        timestampGt: startDate,
        timestampLt: new Date(),
      }),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row items-center justify-between">
        <h2 className="text-2xl font-semibold">{client.name}</h2>
        <Link
          href={`/dashboard/apis/${props.params.apiId}/clients/${client.id}/settings`}
          className="flex flex-row items-center gap-2 rounded-md border border-stone-300 p-2 text-sm font-medium shadow"
        >
          Settings
          <Settings className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex flex-row items-center rounded border border-stone-300 p-4 shadow">
        <div className="flex flex-col">
          <h4 className="font-thin">Number of Generations This Month</h4>
          <p className="text-xl font-bold">{generations.total}</p>
        </div>
        <Separator orientation="vertical" className="mx-5 h-8" />
        <div className="flex flex-col">
          <h4 className="font-thin">Number of Verifications This Month</h4>
          <p className="text-xl font-bold">
            {verifications.failed + verifications.successful}
          </p>
        </div>
      </div>
      <Separator />
      <div className="flex flex-col gap-4">
        <div className="flex flex-row justify-between">
          <h4 className="text-center text-2xl font-semibold">Analytics</h4>
          <div className="flex w-1/6 flex-row items-center gap-2">
            <DateRangeSelector timePeriod={timePeriod} />
          </div>
        </div>
        <TokenVerificationsChart
          data={verificationsByMonth.map((item) => ({
            ...item,
            yearMonthDay: `${item.year}-${item.month}-${item.day}`,
          }))}
          groupBy="day"
        />
        <TokenGenerationsChart
          data={generationsByMonth.map((item) => ({
            ...item,
            yearMonthDay: `${item.year}-${item.month}-${item.day}`,
          }))}
          groupBy="day"
        />
      </div>
    </div>
  );
}
