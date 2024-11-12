"use client";

import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/hooks/use-toast";
import { Copy, Lock } from "lucide-react";
import { RotateSigningSecret } from "./rotate-signing-secret";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Ellipses } from "@/components/icons/ellipses";
import { api } from "@/trpc/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type SigningSecretsProps = {
  apiId: string;
  currentSigningSecret: {
    id: string;
    expiresAt: Date | null;
  };
  nextSigningSecret: {
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
    "Tokens signed with this secret can still be validated, but no future tokens will be signed with it.",
  current:
    "This signing secret is the only valid secret for signing tokens and validating tokens.",
  next: "All future tokens will be signed with this signing secret.",
} as const;

export function SigningSecretItem({
  id,
  type,
  expiresAt,
}: {
  id: string;
  type: "current_but_expiring" | "current" | "next";
  expiresAt?: Date | null;
}) {
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  const getSigningSecretValue = api.apis.getSigningSecretValue.useMutation({
    onSuccess: (data) => {
      setSecret(data.secret);
      setIsOpen(true);
    },
  });

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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
      }}
    >
      <div className="m-1 flex-grow rounded-sm hover:bg-stone-100">
        <div className="flex flex-grow flex-row items-center justify-between px-4 py-3">
          <div className="flex flex-col gap-2">
            <p
              className={`w-fit rounded-sm border ${badgeBorderColor} px-1 py-0.5 text-xs font-semibold ${badgeTextColor}`}
            >
              {statusToTitle[type]}{" "}
              {expiresAt ? `${expiresAt.toLocaleString()}` : ""}
            </p>
            <p className="text-xs text-stone-500">
              {statusToDescription[type]}
            </p>
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
                    className="flex w-full flex-row items-center gap-2 text-left font-light text-stone-900 focus:outline-none focus:ring-0 focus:ring-transparent focus:ring-offset-0"
                    onClick={() => {
                      navigator.clipboard
                        .writeText(id)
                        .then(() => {
                          toast({
                            title: "Client ID Copied",
                            description: "Client ID copied to clipboard",
                          });
                        })
                        .catch((err) => {
                          console.error(err);
                          alert(err);
                        });
                    }}
                  >
                    Copy ID
                    <Copy className="h-3 w-3 text-stone-900" />
                  </button>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <button
                    className="flex w-full flex-row items-center gap-2 text-left font-light text-stone-900 focus:outline-none focus:ring-0 focus:ring-transparent focus:ring-offset-0"
                    onClick={() => {
                      getSigningSecretValue.mutate({
                        signingSecretId: id,
                      });
                    }}
                  >
                    Get Signing Secret
                    <Lock className="h-3 w-3 text-stone-900" />
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <DialogContent className="max-w-4xl">
        <div className="flex w-full flex-col gap-2">
          <p className="font-semibold">Signing Secret</p>
          <pre className="flex flex-col items-center gap-2 rounded-md border border-border bg-muted px-2.5 py-2 font-mono text-sm text-primary transition-colors hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 max-sm:text-xs sm:overflow-hidden">
            <pre>{showSecret ? secret : secret.replace(/./g, "*")}</pre>
          </pre>
          <div className="flex flex-row items-end justify-end gap-2">
            <Button
              className="w-min bg-stone-800 hover:bg-stone-900"
              onClick={() => setShowSecret((prevVal) => !prevVal)}
            >
              {showSecret ? "Hide" : "Show"}
            </Button>
            <Button
              className="w-min bg-stone-800 hover:bg-stone-900"
              onClick={() => {
                navigator.clipboard
                  .writeText(secret)
                  .then(() => {
                    toast({
                      title: "Signing Secret Copied",
                      description: "Signing Secret copied to clipboard",
                    });
                  })
                  .catch((err) => {
                    console.error(err);
                    alert(err);
                  });
              }}
            >
              Copy
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SigningSecrets({
  apiId,
  currentSigningSecret,
  nextSigningSecret,
}: SigningSecretsProps) {
  return (
    <div>
      <div className="flex flex-row items-center justify-between">
        <div>
          <h1 className="mb-3 text-xl font-semibold">Signing Secrets</h1>
          <p className="mb-3 text-sm text-stone-500">
            These are the signing secrets that are valid for this API. You can
            rotate signing secrets to invalidate all old tokens once the current
            signing secret expires.
          </p>
        </div>
        <RotateSigningSecret apiId={apiId} />
      </div>
      <div className="flex flex-col rounded-md border border-stone-300 bg-stone-50 shadow">
        <SigningSecretItem
          id={currentSigningSecret.id}
          type={nextSigningSecret ? "current_but_expiring" : "current"}
          expiresAt={currentSigningSecret.expiresAt}
        />
        {nextSigningSecret && (
          <>
            <Separator />
            <SigningSecretItem id={nextSigningSecret.id} type="next" />
          </>
        )}
      </div>
    </div>
  );
}
