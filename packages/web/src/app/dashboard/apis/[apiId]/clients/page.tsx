import { getClientsByApi } from "@/server/data/clients";
import { CreateClientButton } from "./create-client-button";
import { ClientItem } from "./client-item";

type PageProps = {
  params: { apiId: string };
};

export default async function Clients(props: PageProps) {
  const clients = await getClientsByApi(props.params.apiId);

  return (
    <>
      <div className="mb-6 flex flex-row items-center justify-between">
        <h2 className="text-2xl">Clients</h2>
        <CreateClientButton />
      </div>
      {clients.map((_, idx) => (
        <ClientItem key={idx} />
      ))}
    </>
  );
}
