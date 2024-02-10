"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";
import { useState } from "react";

type Props = {
  data: { id: string; name: string }[];
};

function RootClientItem(props: { id: string; name: string }) {
  return (
    <div className="hover:bg-stone-100">
      <div className="flex flex-row items-center justify-between space-y-1 px-4 py-5">
        <h4 className="font-medium leading-none">{props.name}</h4>
        <p className="w-min rounded bg-stone-200 px-2 py-1 font-mono text-xs">
          {props.id}
        </p>
      </div>
      <Separator />
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      className="h-5 w-5 text-black"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      className="h-5 w-5 text-black"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
      />
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
  );
}

function EyeSlashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      className="h-5 w-5 text-black"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  );
}

export function RootClients(props: Props) {
  const [rootClientName, setRootClientName] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  const createRootClient = api.clients.createRootClient.useMutation({
    onSuccess(data) {
      setClientId(data.clientId);
      setClientSecret(data.clientSecret);
      setIsOpen(true);
    },
    onError(err) {
      console.error(err);
      alert(err.message);
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
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
          <pre className="inlineflex border-border focus:ring-ring bg-muted text-primary hover:border-primary ph-no-capture flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 font-mono text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 max-sm:text-xs sm:overflow-hidden">
            <pre>{clientId}</pre>
            <div>
              <Button
                className="w-min bg-transparent hover:bg-stone-200"
                onClick={() => navigator.clipboard.writeText(clientId)}
              >
                <CopyIcon />
              </Button>
            </div>
          </pre>
        </div>
        <div className="mb-4">
          <p className="font-semibold">Client Secret</p>
          <pre className="inlineflex border-border focus:ring-ring bg-muted text-primary hover:border-primary ph-no-capture flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 font-mono text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 max-sm:text-xs sm:overflow-hidden">
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
                <CopyIcon />
              </Button>
            </div>
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
