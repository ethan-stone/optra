import { getClientsByApi } from "@/server/data/clients";
import { CreateClientButton } from "./create-client-button";
import { ClientItem } from "./client-item";
import { Separator } from "@/components/ui/separator";

type PageProps = {
  params: { apiId: string };
};

export default async function Clients(props: PageProps) {
  const clients = await getClientsByApi(props.params.apiId);

  return (
    <div>
      <div className="mb-6 flex flex-row items-center justify-between">
        <h2 className="text-2xl font-semibold">Clients</h2>
        <CreateClientButton />
      </div>
      <div className="flex flex-col rounded-md border border-stone-300 shadow">
        {clients.map((c, idx) => (
          <>
            <ClientItem
              key={idx}
              name={c.name}
              id={c.id}
              apiId={props.params.apiId}
            />
            {idx < clients.length - 1 && <Separator />}
          </>
        ))}
      </div>
    </div>
  );
}
