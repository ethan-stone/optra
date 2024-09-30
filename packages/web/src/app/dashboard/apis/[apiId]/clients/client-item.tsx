"use client";

import { api } from "@/trpc/react";
import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Ellipses } from "@/components/icons/ellipses";
import { useToast } from "@/components/hooks/use-toast";

type Props = {
  id: string;
  name: string;
  apiId: string; // Add this prop
  numTokens: number;
};

export function ClientItem(props: Props) {
  const router = useRouter();

  const { toast } = useToast();

  const deleteClient = api.clients.deleteClient.useMutation({
    onSuccess() {
      router.refresh();
      toast({
        title: "Client Deleted",
        description: "Client deleted successfully",
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
          href={`/dashboard/apis/${props.apiId}/clients/${props.id}`}
          className="flex w-full flex-col justify-center gap-2 text-sm"
        >
          <h4 className="w-fit leading-none">{props.name}</h4>
        </Link>
        <div className="flex w-2/3 flex-row items-center justify-start">
          <div className="flex w-fit items-center gap-2">
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
                    deleteClient.mutate({ id: props.id });
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
