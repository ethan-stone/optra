import { Separator } from "@/components/ui/separator";
import {
  getGenerations,
  getGenerationsGroupedByMonth,
  getVerifications,
  getVerificationsGroupedByMonth,
} from "@/server/data/analytics";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getTenantId } from "@/utils/auth";
import { notFound, redirect } from "next/navigation";
import { TokenVerificationsChart } from "@/components/ui/token-verifications-chart";
import { TokenGenerationsChart } from "@/components/ui/token-generations-chart";
import { getClientByWorkspaceIdAndClientId } from "@/server/data/clients";
import Link from "next/link";
import { Settings } from "lucide-react";

type ClientPageProps = {
  params: { apiId: string; clientId: string };
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
      getGenerationsGroupedByMonth({
        workspaceId: workspace.id,
        apiId: props.params.apiId,
        clientId: props.params.clientId,
        timestampGt: new Date(new Date().setMonth(new Date().getMonth() - 1)),
        timestampLt: new Date(),
      }),
      getVerificationsGroupedByMonth({
        workspaceId: workspace.id,
        apiId: props.params.apiId,
        clientId: props.params.clientId,
        timestampGt: new Date(new Date().setMonth(new Date().getMonth() - 1)),
        timestampLt: new Date(),
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
      <TokenVerificationsChart data={filledVerifications} />
      <TokenGenerationsChart data={filledGenerations} />
    </div>
  );
}
