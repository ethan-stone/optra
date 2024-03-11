import { Separator } from "@/components/ui/separator";
import { getGenerations, getVerifications } from "@/server/data/analytics";
import { getTotalClientsForApi } from "@/server/data/clients";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getTenantId } from "@/utils/auth";
import { notFound } from "next/navigation";

type ApiPageProps = {
  params: { apiId: string };
};

export default async function OverviewPage(props: ApiPageProps) {
  const tenantId = getTenantId();

  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    return notFound();
  }

  const numClients = await getTotalClientsForApi(props.params.apiId);

  const generations = await getGenerations({
    workspaceId: workspace.id,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    apiId: props.params.apiId,
  });

  const verifications = await getVerifications({
    workspaceId: workspace.id,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    apiId: props.params.apiId,
  });

  return (
    <div className="flex flex-col">
      <div className="flex flex-row items-center rounded border p-4">
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
    </div>
  );
}
