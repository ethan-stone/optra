"use client";

import { Spinner } from "@/components/icons/spinner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";
import { Copy } from "lucide-react";
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
            className="flex w-min flex-row items-center justify-center gap-2 rounded bg-stone-200 px-2 py-1 font-mono text-xs"
            onClick={(e) => e.preventDefault()}
          >
            {props.id}
            <button onClick={() => navigator.clipboard.writeText(props.id)}>
              <Copy className="h-4 w-4 text-stone-900" />
            </button>
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
