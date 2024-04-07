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

type Props = {
  scopes: { id: string; name: string; description: string }[];
};

export function NewClientForm(props: Props) {
  const [clientName, setClientName] = useState("");
  const [clientIdPrefix, setClientIdPrefix] = useState("");
  const [clientSecretPrefix, setClientSecretPrefix] = useState("");

  const [isOpen, setIsOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  const router = useRouter();
  const params = useParams<{ apiId: string }>();

  const createClient = api.clients.createClient.useMutation({
    onSuccess(data) {
      setClientId(data.clientId);
      setClientSecret(data.clientSecret);
      setClientName("");
      setClientIdPrefix("");
      setClientSecretPrefix("");
      setIsOpen(true);
      router.refresh();
    },
    onError(err) {
      console.error(err);
      alert(err.message);
    },
  });

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
      <div className="flex flex-col gap-4">
        <div>
          <h4 className="pb-2">Client Name</h4>
          <Input
            value={clientName}
            placeholder="Client Name"
            onChange={(e) => setClientName(e.target.value)}
          />
        </div>
        <div>
          <h4 className="flex flex-row gap-2 pb-2">
            Client ID Prefix
            <p className="rounded bg-stone-200 px-1">Optional</p>
          </h4>
          <Input
            value={clientIdPrefix}
            placeholder="Client ID Prefix"
            onChange={(e) => setClientIdPrefix(e.target.value)}
          />
        </div>
        <div>
          <h4 className="flex flex-row gap-2 pb-2">
            Client Secret Prefix
            <p className="rounded bg-stone-200 px-1">Optional</p>
          </h4>
          <Input
            value={clientSecretPrefix}
            placeholder="Client Secret Prefix"
            onChange={(e) => setClientSecretPrefix(e.target.value)}
          />
        </div>
        <div>
          <h4 className="pb-2">Permissions</h4>
          <DataTable />
        </div>
        <Button
          disabled={createClient.isLoading || clientName.length === 0}
          onClick={() =>
            createClient.mutate({
              apiId: params.apiId,
              name: clientName,
              clientIdPrefix:
                clientIdPrefix.length === 0 ? undefined : clientIdPrefix,
              clientSecretPrefix:
                clientSecretPrefix.length === 0
                  ? undefined
                  : clientSecretPrefix,
              scopes: table
                .getSelectedRowModel()
                .flatRows.map((row) => row.original.name),
            })
          }
        >
          {createClient.isLoading ? "Creating..." : "Create Client"}
        </Button>
      </div>
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
