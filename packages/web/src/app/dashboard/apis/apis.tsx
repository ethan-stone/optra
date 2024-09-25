"use client";

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
    <div className="hover:bg-stone-50">
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
              0 Clients
            </p>
            <p className="rounded-md border border-gray-300 bg-stone-200 px-1 py-0.5 text-xs">
              0 Tokens This Month
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
                  className="w-full text-left font-light text-red-700 focus:outline-none focus:ring-0 focus:ring-transparent focus:ring-offset-0"
                  onClick={() => deleteApi.mutate({ id: props.id })}
                >
                  Delete
                </button>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <button
                  className="flex w-full flex-row items-center gap-2 text-left font-light text-stone-900 focus:outline-none focus:ring-0 focus:ring-transparent focus:ring-offset-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    navigator.clipboard.writeText(props.id).catch((err) => {
                      console.error(err);
                      alert(err);
                    });
                  }}
                >
                  Copy ID
                  <Copy className="h-3 w-3 text-stone-900" />
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
    <div className="flex flex-col pt-4">
      {props.data.map((api, idx) => (
        <ApiItem key={idx} id={api.id} name={api.name} />
      ))}
    </div>
  );
}
