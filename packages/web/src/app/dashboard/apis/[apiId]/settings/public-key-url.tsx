"use client";

import { useToast } from "@/components/hooks/use-toast";
import { Copy, ExternalLinkIcon } from "lucide-react";

export function PublicKeyUrl(props: { publicKeyUrl: string }) {
  const { toast } = useToast();

  return (
    <div>
      <div>
        <h1 className="mb-3 text-xl font-semibold">Public Key URL</h1>
        <p className="mb-3 text-sm text-stone-500">
          This is the URL to the JSON Web Key Set (JWKS) for this API. Each key
          in the set is a public key that corresponds to one of currently valid
          signing secret private keys, and can be used to verify a JWT was
          signed with one of the private keys.
        </p>
      </div>
      <div className="rounded border border-stone-300 bg-stone-50 p-4 text-sm shadow">
        <div className="flex flex-row items-center justify-between gap-2">
          {props.publicKeyUrl}
          <div className="flex flex-row items-center gap-4">
            <ExternalLinkIcon
              className="h-4 w-4 cursor-pointer"
              onClick={() => {
                window.open(props.publicKeyUrl, "_blank");
              }}
            />
            <Copy
              className="h-4 w-4 cursor-pointer"
              onClick={async () => {
                await navigator.clipboard.writeText(props.publicKeyUrl);
                toast({
                  title: "Copied",
                  description: "Public Key URL copied to clipboard",
                });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
