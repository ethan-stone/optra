"use client";

import { useToast } from "@/components/hooks/use-toast";
import { Ellipses } from "@/components/icons/ellipses";
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
import Link from "next/link";
import { useRouter } from "next/navigation";

function ApiItem(props: {
  id: string;
  name: string;
  numClients: number;
  numTokens: number;
}) {
  const router = useRouter();

  const { toast } = useToast();

  const deleteApi = api.apis.deleteApi.useMutation({
    onSuccess() {
      router.refresh();
      toast({
        title: "API Deleted",
        description: "API deleted successfully",
      });
    },
    onError(err) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="m-1 rounded-sm hover:bg-stone-50">
      <div className="flex flex-row justify-between space-y-1 px-4 py-3">
        <Link
          className="flex w-full flex-col justify-center gap-2 text-sm"
          href={`/dashboard/apis/${props.id}`}
        >
          <h4 className="w-fit leading-none">{props.name}</h4>
        </Link>
        <div className="flex w-2/3 flex-row items-center justify-start">
          <div className="flex w-fit items-center gap-2">
            <p className="rounded-md border border-gray-300 bg-stone-200 px-1 py-0.5 text-xs">
              {props.numClients} Clients
            </p>
            <p className="rounded-md border border-gray-300 bg-stone-200 px-1 py-0.5 text-xs">
              {props.numTokens} Tokens This Month
            </p>
          </div>
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
                          title: "API ID Copied",
                          description: "API ID copied to clipboard",
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
                  onClick={() => deleteApi.mutate({ id: props.id })}
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

type Props = {
  data: {
    id: string;
    name: string;
    numClients: number;
    numTokens: number;
  }[];
};

export function Apis(props: Props) {
  return (
    <div className="flex flex-col pt-4">
      {props.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md">
          <div className="flex flex-col items-center justify-between gap-4 p-4">
            <h1 className="text-2xl font-semibold">No APIs found</h1>
            <p className="text text-stone-500">
              Looks like there are no APIs for this workspace. Create one to get
              started.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col rounded-md border border-stone-300 shadow">
          {props.data.map((api, idx) => (
            <div key={idx}>
              <ApiItem
                key={idx}
                id={api.id}
                name={api.name}
                numClients={api.numClients}
                numTokens={api.numTokens}
              />
              {idx < props.data.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
