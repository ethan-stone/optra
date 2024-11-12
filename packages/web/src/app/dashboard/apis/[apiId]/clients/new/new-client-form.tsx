"use client";

import { EyeIcon } from "@/components/icons/eye";
import { EyeSlashIcon } from "@/components/icons/eye-slash";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { Copy } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useDataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import { Textarea } from "@/components/ui/textarea";
import { type SubmitHandler, useForm } from "react-hook-form";
import { type RowSelectionState } from "@tanstack/react-table";
import { useToast } from "@/components/hooks/use-toast";

type Props = {
  scopes: { id: string; name: string; description: string }[];
};

type FormInput = {
  clientName: string;
  clientIdPrefix: string;
  clientSecretPrefix: string;
  metadata: string;
};

export function NewClientForm(props: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  const router = useRouter();
  const params = useParams<{ apiId: string }>();

  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormInput>({
    defaultValues: {
      metadata: "{}",
    },
  });

  const createClient = api.clients.createClient.useMutation({
    onSuccess(data) {
      setClientId(data.clientId);
      setClientSecret(data.clientSecret);
      setIsOpen(true);
      router.refresh();
      reset({
        metadata: "{}",
      });
    },
    onError(err) {
      console.error(err);
    },
  });

  const onSubmit: SubmitHandler<FormInput> = (data) => {
    createClient.mutate({
      apiId: params.apiId,
      name: data.clientName,
      clientIdPrefix:
        data.clientIdPrefix.length === 0 ? undefined : data.clientIdPrefix,
      clientSecretPrefix:
        data.clientSecretPrefix.length === 0
          ? undefined
          : data.clientSecretPrefix,
      scopes: table
        .getSelectedRowModel()
        .flatRows.map((row) => row.original.name),
      metadata: JSON.parse(data.metadata) as Record<string, unknown>,
    });
  };

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { table, DataTable } = useDataTable({
    columns,
    data: props.scopes,
    getRowId: (row) => row.id,
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        setClientId("");
        setClientSecret("");
        setShowSecret(false);
      }}
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">Name</h2>
          <p className="text-sm text-stone-500">
            A human-readable name for the client.
          </p>
          <Input
            {...register("clientName", {
              required: true,
              minLength: 1,
              maxLength: 100,
            })}
            placeholder="Client Name"
          />
          {errors.clientName !== undefined && (
            <p className="text-sm text-red-500">A client name is required</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="flex flex-row gap-2 text-sm font-semibold">
            Client ID Prefix
            <p className="rounded-md border border-gray-400 bg-stone-300 px-1 py-0.5 text-xs">
              Optional
            </p>
          </h2>
          <p className="text-sm text-stone-500">A prefix for the client ID.</p>
          <Input
            {...register("clientIdPrefix", {
              maxLength: 12,
              pattern: RegExp(/^[a-zA-Z_]+$/),
            })}
            placeholder="Client ID Prefix"
          />
          {errors.clientIdPrefix !== undefined && (
            <p className="text-sm text-red-500">
              Prefixes must be a max of 12 characters a-z, A-Z
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="flex flex-row gap-2 text-sm font-semibold">
            Client Secret Prefix
            <p className="rounded-md border border-gray-400 bg-stone-300 px-1 py-0.5 text-xs">
              Optional
            </p>
          </h2>
          <p className="text-sm text-stone-500">
            A prefix for the client secret.
          </p>
          <Input
            {...register("clientSecretPrefix", {
              maxLength: 12,
              pattern: RegExp(/^[a-zA-Z_]+$/),
            })}
            placeholder="Client Secret Prefix"
          />
          {errors.clientSecretPrefix !== undefined && (
            <p className="text-sm text-red-500">
              Prefixes must be a max of 12 characters a-z, A-Z
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="flex flex-row gap-2 text-sm font-semibold  ">
            Metadata
            <p className="rounded-md border border-gray-400 bg-stone-300 px-1 py-0.5 text-xs">
              Optional
            </p>
          </h2>
          <p className="text-sm text-stone-500">
            Metadata is optional and can be used to store additional information
            about the client.
          </p>
          <Textarea
            {...register("metadata", {
              validate: (data) => {
                try {
                  JSON.parse(data);
                  return true;
                } catch (error) {
                  return false;
                }
              },
            })}
            placeholder="{}"
          />
          {errors.metadata !== undefined && (
            <p className="text-sm text-red-500">Metadata must be JSON string</p>
          )}
        </div>
        <div>
          <h2 className="flex flex-row gap-2 text-sm font-semibold">
            Permissions
          </h2>
          <DataTable />
        </div>
        <Button type="submit" disabled={createClient.isLoading}>
          {createClient.isLoading ? "Creating..." : "Create Client"}
        </Button>
      </form>
      <DialogContent>
        <div className="mt-2">
          <p className="font-semibold">Client ID</p>
          <pre className="inlineflex ph-no-capture flex w-full items-center justify-between gap-2 rounded-md border border-border bg-muted px-2.5 py-2 font-mono text-sm text-primary transition-colors hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 max-sm:text-xs sm:overflow-hidden">
            <pre>{clientId}</pre>
            <div>
              <Button
                className="w-min bg-transparent hover:bg-stone-200"
                onClick={async () => {
                  await navigator.clipboard.writeText(clientId);
                  toast({
                    title: "Copied to clipboard",
                    description: "Client ID has been copied to clipboard",
                  });
                }}
              >
                <Copy className="h-5 w-5 text-stone-900" />
              </Button>
            </div>
          </pre>
        </div>
        <div className="mb-4">
          <p className="font-semibold">Client Secret</p>
          <pre className="inlineflex ph-no-capture flex w-full items-center justify-between gap-2 rounded-md border border-border bg-muted px-2.5 py-2 font-mono text-sm text-primary transition-colors hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 max-sm:text-xs sm:overflow-hidden">
            <pre>
              {showSecret ? clientSecret : "********************************"}
            </pre>
            <div>
              <Button
                className="w-min bg-transparent hover:bg-stone-200"
                onClick={() => setShowSecret((prevVal) => !prevVal)}
              >
                {showSecret ? <EyeSlashIcon /> : <EyeIcon />}
              </Button>
              <Button
                className="w-min bg-transparent hover:bg-stone-200"
                onClick={async () => {
                  await navigator.clipboard.writeText(clientSecret);
                  toast({
                    title: "Copied to clipboard",
                    description: "Client secret has been copied to clipboard",
                  });
                }}
              >
                <Copy className="h-5 w-5 text-stone-900" />
              </Button>
            </div>
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
