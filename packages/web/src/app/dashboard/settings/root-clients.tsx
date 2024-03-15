"use client";

import { EyeIcon } from "@/components/icons/eye";
import { EyeSlashIcon } from "@/components/icons/eye-slash";
import { Spinner } from "@/components/icons/spinner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";
import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  data: { id: string; name: string }[];
};

function RootClientItem(props: { id: string; name: string }) {
  const router = useRouter();

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
    <div className="hover:bg-stone-100">
      <div className="flex flex-row items-center justify-between space-y-1 px-4 py-5">
        <h4 className="font-medium leading-none">{props.name}</h4>
        <div className="flex flex-row items-center gap-4">
          <p className="w-min rounded bg-stone-200 px-2 py-1 font-mono text-xs">
            {props.id}
          </p>
          <Button
            className="bg-red-500 hover:bg-red-700"
            onClick={() =>
              deleteRootClient.mutate({
                id: props.id,
              })
            }
          >
            {deleteRootClient.isLoading ? <Spinner /> : "Delete"}
          </Button>
        </div>
      </div>
      <Separator />
    </div>
  );
}

export function RootClients(props: Props) {
  const [rootClientName, setRootClientName] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  const router = useRouter();

  const createRootClient = api.clients.createRootClient.useMutation({
    onSuccess(data) {
      setClientId(data.clientId);
      setClientSecret(data.clientSecret);
      setRootClientName("");
      setIsOpen(true);
      router.refresh();
    },
    onError(err) {
      console.error(err);
      alert(err.message);
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
      <Input
        type="text"
        value={rootClientName}
        placeholder="Root Client Name"
        onChange={(e) => setRootClientName(e.target.value)}
      />
      <Button
        className="mb-6 mt-2"
        disabled={createRootClient.isLoading}
        onClick={() =>
          createRootClient.mutate({
            name: rootClientName,
          })
        }
      >
        {createRootClient.isLoading ? "Creating..." : "Create Root Client"}
      </Button>
      {props.data.map((client, idx) => (
        <RootClientItem key={idx} {...client} />
      ))}
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
