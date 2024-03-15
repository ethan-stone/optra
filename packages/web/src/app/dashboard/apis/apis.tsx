"use client";

import { Spinner } from "@/components/icons/spinner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function ApiItem(props: { id: string; name: string }) {
  const router = useRouter();

  const deleteApi = api.apis.deleteApi.useMutation({
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
      <div className="flex flex-row justify-between space-y-1 px-4 py-5">
        <Link
          className="flex flex-grow items-center"
          href={`/dashboard/apis/${props.id}`}
        >
          <h4 className="font-medium leading-none">{props.name}</h4>
        </Link>
        <div className="flex flex-row items-center gap-4">
          <p
            className="w-min rounded bg-stone-200 px-2 py-1 font-mono text-xs"
            onClick={(e) => e.preventDefault()}
          >
            {props.id}
          </p>
          <Button
            className="bg-red-500 hover:bg-red-700"
            onClick={() =>
              deleteApi.mutate({
                id: props.id,
              })
            }
          >
            {deleteApi.isLoading ? <Spinner /> : "Delete"}
          </Button>
        </div>
      </div>
      <Separator />
    </div>
  );
}

type Props = {
  data: { id: string; name: string }[];
};

export function Apis(props: Props) {
  return (
    <>
      {props.data.map((api, idx) => (
        <ApiItem key={idx} id={api.id} name={api.name} />
      ))}
    </>
  );
}
