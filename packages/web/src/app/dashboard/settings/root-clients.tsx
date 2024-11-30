"use client";

import { useToast } from "@/components/hooks/use-toast";
import { Ellipses } from "@/components/icons/ellipses";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";
import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  data: { id: string; name: string }[];
};

function RootClientItem(props: { id: string; name: string }) {
  const router = useRouter();

  const { toast } = useToast();

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
    <div className="m-1 rounded-sm hover:bg-stone-100">
      <div className="flex flex-row items-center justify-between px-4 py-3">
        <div className="flex w-full flex-col justify-center gap-2 text-sm">
          <h4 className="w-fit leading-none">{props.name}</h4>
        </div>
        <div className="flex flex-row items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-row gap-2 rounded border border-stone-300 bg-white p-1 shadow-sm focus:outline-none focus:ring-0 focus:ring-transparent focus:ring-offset-0">
                <Ellipses />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <button
                  className="flex w-full flex-row items-center gap-2 text-left font-light text-stone-900 focus:outline-none focus:ring-0 focus:ring-transparent focus:ring-offset-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    navigator.clipboard
                      .writeText(props.id)
                      .then(() => {
                        toast({
                          title: "Client ID Copied",
                          description: "Client ID copied to clipboard",
                        });
                      })
                      .catch((err) => {
                        console.error(err);
                        alert(err);
                      });
                  }}
                >
                  Copy ID
                  <Copy className="h-3 w-3 text-stone-900" />
                </button>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <button
                  className="w-full text-left font-light text-red-700 focus:outline-none focus:ring-0 focus:ring-transparent focus:ring-offset-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteRootClient.mutate({ id: props.id });
                  }}
                >
                  Delete
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export function RootClients(props: Props) {
  const router = useRouter();

  return (
    <>
      <div className="mb-6 flex flex-row items-center justify-between">
        <h2 className="text-2xl font-semibold">Root Clients</h2>
        <Button
          onClick={() => router.push("/dashboard/settings/root-clients/new")}
        >
          Create Root Client
        </Button>
      </div>
      {props.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md">
          <div className="flex flex-col items-center justify-between gap-4 p-4">
            <h1 className="text-2xl font-semibold">No root clients found</h1>
            <p className="text text-stone-500">
              Looks like there are no root clients for this workspace. Create
              one to get started.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col rounded-md border border-stone-300 bg-stone-50 shadow">
          {props.data.map((client, idx) => (
            <div key={idx}>
              <RootClientItem key={idx} {...client} />
              {idx < props.data.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
