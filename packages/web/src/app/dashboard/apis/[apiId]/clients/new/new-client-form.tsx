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
      alert(err.message);
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

  const { table, DataTable } = useDataTable({
    columns,
    data: props.scopes,
    getRowId: (row) => row.id,
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
        <div>
          <h4 className="pb-2">Client Name</h4>
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
        <div>
          <h4 className="flex flex-row gap-2 pb-2">
            Client ID Prefix
            <p className="rounded bg-stone-200 px-1">Optional</p>
          </h4>
          <Input
            {...register("clientIdPrefix", {
              maxLength: 12,
              pattern: RegExp(/^[A-Za-z]+$/),
            })}
            placeholder="Client ID Prefix"
          />
          {errors.clientIdPrefix !== undefined && (
            <p className="text-sm text-red-500">
              Prefixes must be a max of 12 characters a-z, A-Z
            </p>
          )}
        </div>
        <div>
          <h4 className="flex flex-row gap-2 pb-2">
            Client Secret Prefix
            <p className="rounded bg-stone-200 px-1">Optional</p>
          </h4>
          <Input
            {...register("clientSecretPrefix", {
              maxLength: 12,
              pattern: RegExp(/^[A-Za-z]+$/),
            })}
            placeholder="Client Secret Prefix"
          />
          {errors.clientSecretPrefix !== undefined && (
            <p className="text-sm text-red-500">
              Prefixes must be a max of 12 characters a-z, A-Z
            </p>
          )}
        </div>
        <div>
          <h4 className="flex flex-row gap-2 pb-2">
            Metadata
            <p className="rounded bg-stone-200 px-1">Optional</p>
          </h4>
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
          <h4 className="pb-2">Permissions</h4>
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
                onClick={() => navigator.clipboard.writeText(clientId)}
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
                onClick={() => navigator.clipboard.writeText(clientSecret)}
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
