"use client";

import { Spinner } from "@/components/icons/spinner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";
import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Props = {
  id: string;
  name: string;
  apiId: string; // Add this prop
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
      <Link href={`/dashboard/apis/${props.apiId}/clients/${props.id}`}>
        <div className="flex flex-row items-center justify-between space-y-1 px-4 py-5">
          <h4 className="flex flex-row gap-2 font-medium leading-none">
            {props.name}
          </h4>
          <div className="flex flex-row items-center gap-4">
            <p className="flex w-min flex-row items-center justify-center gap-2 rounded bg-stone-200 px-2 py-1 font-mono text-xs">
              {props.id}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  navigator.clipboard.writeText(props.id).catch((err) => {
                    console.error(err);
                    alert(err);
                  });
                }}
              >
                <Copy className="h-4 w-4 text-stone-900" />
              </button>
            </p>
            <Button
              className="bg-red-500 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                deleteClient.mutate({ id: props.id });
              }}
            >
              {deleteClient.isLoading ? <Spinner /> : "Delete"}
            </Button>
          </div>
        </div>
      </Link>
      <Separator />
    </div>
  );
}
