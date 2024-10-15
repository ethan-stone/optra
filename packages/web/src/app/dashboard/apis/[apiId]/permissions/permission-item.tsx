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
import { api } from "@/trpc/react";
import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";

type PermissionItemProps = {
  id: string;
  name: string;
  description: string | null;
};

export function PermissionItem(props: PermissionItemProps) {
  const router = useRouter();
  const { toast } = useToast();

  const deleteScope = api.apis.deleteScope.useMutation({
    onSuccess() {
      router.refresh();
      toast({
        title: "Permission Deleted",
        description: "Permission deleted successfully",
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
    <div className="m-1 rounded-sm hover:bg-stone-100">
      <div className="flex flex-row justify-between space-y-1 px-4 py-3">
        <div className="flex flex-col gap-2">
          <div className="flex w-fit flex-row items-center gap-1">
            <div className="flex flex-row items-center gap-1 rounded border border-gray-400 bg-stone-300 px-1 py-0.5 text-sm leading-none">
              {props.name}
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await navigator.clipboard.writeText(props.name);
                  toast({
                    title: "Permission Name Copied",
                    description: "Permission Name copied to clipboard",
                  });
                }}
              >
                <Copy className="h-3 w-3 text-stone-900" />
              </button>
            </div>
          </div>
          <h4 className="text-sm font-light leading-none">
            {props.description}
          </h4>
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
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteScope.mutate({
                      id: props.id,
                    });
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
