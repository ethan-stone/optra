"use client";
import { useToast } from "@/components/hooks/use-toast";
import { Spinner } from "@/components/icons/spinner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
    <div className="hover:bg-stone-100">
      <div className="flex flex-row items-center justify-between space-y-1 px-4 py-5">
        <div className="flex flex-col gap-2">
          <div className="flex flex-row items-center gap-1">
            <h4 className="rounded font-mono font-medium leading-none">
              {props.name}
            </h4>
            <button onClick={() => navigator.clipboard.writeText(props.name)}>
              <Copy className="h-4 w-4 text-stone-900" />
            </button>
          </div>
          <h4 className="text-sm font-light leading-none">
            {props.description}
          </h4>
        </div>
        <Button
          className="bg-red-500 hover:bg-red-700"
          onClick={() =>
            deleteScope.mutate({
              id: props.id,
            })
          }
        >
          {deleteScope.isLoading ? <Spinner /> : "Remove"}
        </Button>
      </div>
      <Separator />
    </div>
  );
}
