import { Separator } from "@/components/ui/separator";
import {
  getGenerations,
  getVerificationsGroupedByMonth,
  getVerifications,
  getGenerationsGroupedByMonth,
} from "@/server/data/analytics";
import { getTotalClientsForApi } from "@/server/data/clients";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getTenantId } from "@/utils/auth";
import { notFound } from "next/navigation";
import { TokenVerificationsChart } from "@/components/ui/token-verifications-chart";
import { TokenGenerationsChart } from "@/components/ui/token-generations-chart";

type ApiPageProps = {
  params: { apiId: string };
};

export default async function OverviewPage(props: ApiPageProps) {
  const tenantId = await getTenantId();

  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    return notFound();
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
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      apiId: props.params.apiId,
    }),
    getVerifications({
      workspaceId: workspace.id,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      apiId: props.params.apiId,
    }),
    getGenerationsGroupedByMonth({
      workspaceId: workspace.id,
      apiId: props.params.apiId,
      timestampGt: new Date(new Date().setMonth(new Date().getMonth() - 12)),
      timestampLt: new Date(),
    }),
    getVerificationsGroupedByMonth({
      timestampGt: new Date(new Date().setMonth(new Date().getMonth() - 12)),
      timestampLt: new Date(),
      workspaceId: workspace.id,
      apiId: props.params.apiId,
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
      <TokenVerificationsChart
        data={verificationsByMonth.map((item) => ({
          ...item,
          yearMonth: `${item.year}-${item.month}`,
        }))}
      />
      <TokenGenerationsChart
        data={generationsByMonth.map((item) => ({
          ...item,
          yearMonth: `${item.year}-${item.month}`,
        }))}
      />
    </div>
  );
}
