"use client";

import { Button } from "@/components/ui/button";
import { useDataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { type SubmitHandler, useForm } from "react-hook-form";
import { columns } from "@/components/ui/scopes-columns";
import { useState } from "react";
import { type RowSelectionState } from "@tanstack/react-table";
import { useToast } from "@/components/hooks/use-toast";

type EditClientFormProps = {
  clientId: string;
  clientName: string;
};

export function EditClientForm(props: {
  clientId: string;
  clientName: string;
  apiId: string;
  apiScopes: { id: string; name: string; description: string }[];
  clientScopes: { id: string; apiScopeId: string }[];
}) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditClientFormProps>({
    defaultValues: {
      clientName: props.clientName,
    },
  });

  const { toast } = useToast();

  const updateClient = api.clients.updateClient.useMutation({
    onSuccess() {
      router.refresh();
      toast({
        title: "Client Updated",
        description: "Client updated successfully",
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

  const onSubmit: SubmitHandler<EditClientFormProps> = (data) => {
    updateClient.mutate({
      id: props.clientId,
      name: data.clientName,
    });
  };

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({
    ...props.clientScopes.reduce<Record<string, boolean>>((acc, scope) => {
      acc[scope.apiScopeId] = true;
      return acc;
    }, {}),
  });

  const setScopes = api.clients.setScopes.useMutation({
    onSuccess() {
      router.refresh();
      toast({
        title: "Client Scopes Saved",
        description: "Client scopes saved successfully",
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

  const { table, DataTable } = useDataTable({
    columns,
    data: props.apiScopes,
    getRowId: (row) => row.id,
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  });

  return (
    <div>
      <h1 className="mb-3 text-xl font-semibold">Basic Settings</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">Name</h2>
          <p className="text-sm text-stone-500">
            A human-readable name for the client.
          </p>
          <Input
            {...register("clientName", { required: true })}
            type="string"
          />
          {errors.clientName !== undefined && (
            <p className="text-sm text-red-500">Name is required</p>
          )}
        </div>
        <div className="flex justify-end">
          <Button type="submit" className="mt-4">
            {updateClient.isLoading ? "Updating..." : "Update"}
          </Button>
        </div>
      </form>
      <Separator className="mb-5 mt-5" />
      <h1 className="mb-3 text-xl font-semibold">Permissions</h1>
      <p className="mb-3 text-sm text-stone-500">
        Select the scopes that the client has access to.
      </p>
      <div>
        <DataTable />
        <div className="flex justify-end">
          <Button
            className="mt-4"
            onClick={() => {
              setScopes.mutate({
                id: props.clientId,
                scopes: table
                  .getSelectedRowModel()
                  .flatRows.map((row) => row.original.id),
              });
            }}
          >
            {setScopes.isLoading ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
