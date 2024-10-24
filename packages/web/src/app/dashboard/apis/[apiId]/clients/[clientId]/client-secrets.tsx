"use client";

import { Separator } from "@/components/ui/separator";
import { RotateClientSecret } from "./rotate-client-secret";
import { Copy } from "lucide-react";
import { useToast } from "@/components/hooks/use-toast";

type ClientSecretsProps = {
  clientId: string;
  currentClientSecret: {
    id: string;
    expiresAt: Date | null;
  };
  nextClientSecret: {
    id: string;
  } | null;
};

const statusToTitle = {
  current_but_expiring: "Expires At",
  current: "Current",
  next: "Next Up",
} as const;

const statusToDescription = {
  current_but_expiring:
    "This secret can still be used to issue tokens, but it will expire at the shown date.",
  current: "This secret is currently the only valid secret for issuing tokens.",
  next: "This secret should be used to issue token before the current one expires.",
} as const;

export function ClientSecretItem({
  id,
  type,
  expiresAt,
}: {
  id: string;
  type: "current" | "current_but_expiring" | "next";
  expiresAt?: Date | null;
}) {
  const { toast } = useToast();

  const badgeBorderColor =
    type === "current_but_expiring"
      ? "border-yellow-700"
      : type === "current"
        ? "border-green-700"
        : "border-blue-700";

  const badgeTextColor =
    type === "current_but_expiring"
      ? "text-yellow-700"
      : type === "current"
        ? "text-green-700"
        : "text-blue-700";

  return (
    <div className="m-1 flex-grow rounded-sm hover:bg-stone-100">
      <div className="flex flex-grow flex-row items-center justify-between px-4 py-3">
        <div className="flex flex-col gap-2">
          <p
            className={`w-fit rounded-sm border ${badgeBorderColor} px-1 py-0.5 text-xs font-semibold ${badgeTextColor}`}
          >
            {statusToTitle[type]}{" "}
            {expiresAt ? `${expiresAt.toLocaleString()}` : ""}
          </p>

          <p className="text-xs text-stone-500">{statusToDescription[type]}</p>
        </div>

        <p className="flex w-fit items-center gap-1 rounded-md border border-stone-400 bg-stone-300 px-1 py-0.5 text-xs">
          {id}
          <button
            className="flex w-full flex-row items-center gap-2 text-left font-light text-stone-900 focus:outline-none focus:ring-0 focus:ring-transparent focus:ring-offset-0"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              navigator.clipboard
                .writeText(id)
                .then(() => {
                  toast({
                    title: "Client Secret ID Copied",
                    description: "Client Secret ID copied to clipboard",
                  });
                })
                .catch((err) => {
                  console.error(err);
                  alert(err);
                });
            }}
          >
            <Copy className="h-3 w-3 text-stone-900" />
          </button>
        </p>
      </div>
    </div>
  );
}

export function ClientSecrets({
  clientId,
  currentClientSecret,
  nextClientSecret,
}: ClientSecretsProps) {
  return (
    <div>
      <div className="flex flex-row items-center justify-between">
        <div>
          <h1 className="mb-3 text-xl font-semibold">Client Secrets</h1>
          <p className="mb-3 text-sm text-stone-500">
            These are the client secrets that are valid for this client.
          </p>
        </div>
        <RotateClientSecret clientId={clientId} />
      </div>
      <div className="flex flex-col rounded-md border border-stone-300 bg-stone-50 shadow">
        <ClientSecretItem
          id={currentClientSecret.id}
          type={nextClientSecret ? "current_but_expiring" : "current"}
          expiresAt={currentClientSecret.expiresAt}
        />
        {nextClientSecret && (
          <>
            <Separator />
            <ClientSecretItem id={nextClientSecret.id} type="next" />
          </>
        )}
      </div>
    </div>
  );
}
