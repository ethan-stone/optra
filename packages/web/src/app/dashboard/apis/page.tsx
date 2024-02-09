import { db } from "@/server/db";
import { getTenantId } from "@/utils/auth";
import { redirect } from "next/navigation";

type Props = {
  id: string;
  name: string;
};

function ApiItem(props: Props) {
  return (
    <div>
      {props.id} {props.name}
    </div>
  );
}

export default async function Apis() {
  const tenantId = getTenantId();

  // TODO: add isNull(deletedAt) to the query once deleting workspaces is implemented
  const workspaces = await db.query.workspaces.findFirst({
    where: (table, { eq }) => eq(table.tenantId, tenantId),
    with: {
      apis: {
        where: (table, { isNull }) => isNull(table.deletedAt),
      },
    },
  });

  if (!workspaces) {
    return redirect("/onboarding");
  }

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex w-1/2 flex-col py-10">
        <h1 className="flex text-4xl">APIs</h1>
        <p className="py-2 font-thin">
          Make APIs that can be consumed from authorized clients
        </p>
        {workspaces.apis.map((a) => (
          <ApiItem key={a.id} id={a.id} name={a.name} />
        ))}
      </div>
    </main>
  );
}
