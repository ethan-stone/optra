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
import { TokenVerificationsChart } from "./token-verifications-chart";
import { TokenGenerationsChart } from "./token-generations-chart";

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
      timestampGt: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      timestampLt: new Date(),
    }),
    getVerificationsGroupedByMonth({
      timestampGt: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      timestampLt: new Date(),
      workspaceId: workspace.id,
      apiId: props.params.apiId,
    }),
  ]);

  const combinedVerifications = verificationsByMonth.map((item) => ({
    ...item,
    yearMonth: `${item.year}-${item.month}`,
  }));

  const combinedGenerations = generationsByMonth.map((item) => ({
    ...item,
    yearMonth: `${item.year}-${item.month}`,
  }));

  // Fill in missing months for the last 12 months
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      yearMonth: `${date.getFullYear()}-${date.getMonth() + 1}`,
    };
  });

  const filledVerifications = last12Months
    .map((monthData) => {
      const existing = combinedVerifications.find(
        (v) => v.yearMonth === monthData.yearMonth,
      );
      return (
        existing ?? {
          successful: 0,
          failed: 0,
          month: monthData.month,
          year: monthData.year,
          yearMonth: monthData.yearMonth,
        }
      );
    })
    .sort((a, b) => {
      if (a.year < b.year) {
        return -1;
      }
      return a.month - b.month;
    });

  const filledGenerations = last12Months
    .map((monthData) => {
      const existing = combinedGenerations.find(
        (g) => g.yearMonth === monthData.yearMonth,
      );
      return (
        existing ?? {
          total: 0,
          month: monthData.month,
          year: monthData.year,
          yearMonth: monthData.yearMonth,
        }
      );
    })
    .sort((a, b) => {
      if (a.year < b.year) {
        return -1;
      }
      return a.month - b.month;
    });

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
      <TokenVerificationsChart data={filledVerifications} />
      <TokenGenerationsChart data={filledGenerations} />
    </div>
  );
}
