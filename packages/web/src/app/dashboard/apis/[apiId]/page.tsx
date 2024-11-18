import { Separator } from "@/components/ui/separator";
import {
  getGenerations,
  getVerifications,
  getVerificationsGroupedByDay,
  getGenerationsGroupedByDay,
} from "@/server/data/analytics";
import { getTotalClientsForApi } from "@/server/data/clients";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getTenantId } from "@/utils/auth";
import { notFound } from "next/navigation";
import { TokenVerificationsChart } from "@/components/ui/token-verifications-chart";
import { TokenGenerationsChart } from "@/components/ui/token-generations-chart";
import { DateRangeSelector } from "@/components/ui/time-range-selector";

type ApiPageProps = {
  params: { apiId: string };
  searchParams: {
    timePeriod?: "1m" | "3m" | "6m";
  };
};

export default async function OverviewPage(props: ApiPageProps) {
  const tenantId = await getTenantId();

  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
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

  const [
    numClients,
    generations,
    verifications,
    generationsByMonth,
    verificationsByMonth,
  ] = await Promise.all([
    getTotalClientsForApi(props.params.apiId),
    getGenerations({
      workspaceId: workspace.id,
      month: new Date().getUTCMonth() + 1,
      year: new Date().getUTCFullYear(),
      apiId: props.params.apiId,
    }),
    getVerifications({
      workspaceId: workspace.id,
      month: new Date().getUTCMonth() + 1,
      year: new Date().getUTCFullYear(),
      apiId: props.params.apiId,
    }),
    getGenerationsGroupedByDay({
      workspaceId: workspace.id,
      apiId: props.params.apiId,
      timestampGt: startDate,
      timestampLt: new Date(),
    }),
    getVerificationsGroupedByDay({
      workspaceId: workspace.id,
      apiId: props.params.apiId,
      timestampGt: startDate,
      timestampLt: new Date(),
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-row items-center rounded border border-stone-300 p-4 shadow">
        <div className="flex flex-col">
          <h4 className="font-thin">Number of Clients</h4>
          <p className="text-xl font-bold">{numClients}</p>
        </div>
        <Separator orientation="vertical" className="mx-5 h-8" />
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
