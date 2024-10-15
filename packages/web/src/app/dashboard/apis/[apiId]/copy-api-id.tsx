"use client";

import { useToast } from "@/components/hooks/use-toast";
import { Copy } from "lucide-react";

export function CopyApiId(props: { id: string }) {
  const { toast } = useToast();

  return (
    <p className="flex w-fit items-center gap-1 rounded-md border border-gray-400 bg-stone-300 px-1 py-0.5 text-xs">
      {props.id}
      <Copy
        className="h-3 w-3 text-stone-900 hover:cursor-pointer"
        onClick={async () => {
          await navigator.clipboard.writeText(props.id);
          toast({
            title: "API ID Copied",
            description: "API ID copied to clipboard",
          });
        }}
      />
    </p>
  );
}
