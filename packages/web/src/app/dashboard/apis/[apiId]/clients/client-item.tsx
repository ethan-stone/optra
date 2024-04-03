"use client";

import { Spinner } from "@/components/icons/spinner";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  name: string;
};

export function ClientItem(props: Props) {
  const router = useRouter();

  const deleteClient = api.clients.deleteClient.useMutation({
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
            onClick={() => deleteClient.mutate({ id: props.id })}
          >
            {deleteClient.isLoading ? <Spinner /> : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}
