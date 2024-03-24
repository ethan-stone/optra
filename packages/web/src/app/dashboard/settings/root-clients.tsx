"use client";

import { Spinner } from "@/components/icons/spinner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

type Props = {
  data: { id: string; name: string }[];
};

function RootClientItem(props: { id: string; name: string }) {
  const router = useRouter();

  const deleteRootClient = api.clients.deleteRootClient.useMutation({
    onSuccess() {
      router.refresh();
    },
    onError(err) {
      console.error(err);
      alert(err.message);
    },
  });

  return (
    <div className="hover:bg-stone-100">
      <div className="flex flex-row items-center justify-between space-y-1 px-4 py-5">
        <h4 className="font-medium leading-none">{props.name}</h4>
        <div className="flex flex-row items-center gap-4">
          <p className="w-min rounded bg-stone-200 px-2 py-1 font-mono text-xs">
            {props.id}
          </p>
          <Button
            className="bg-red-500 hover:bg-red-700"
            onClick={() =>
              deleteRootClient.mutate({
                id: props.id,
              })
            }
          >
            {deleteRootClient.isLoading ? <Spinner /> : "Delete"}
          </Button>
        </div>
      </div>
      <Separator />
    </div>
  );
}

export function RootClients(props: Props) {
  const router = useRouter();

  return (
    <>
      <div className="flex flex-row items-center justify-between">
        <h2 className="text-2xl">Root Clients</h2>
        <Button
          className="mb-6 mt-2"
          onClick={() => router.push("/dashboard/settings/root-clients/new")}
        >
          Create Root Client
        </Button>
      </div>
      {props.data.map((client, idx) => (
        <RootClientItem key={idx} {...client} />
      ))}
    </>
  );
}
