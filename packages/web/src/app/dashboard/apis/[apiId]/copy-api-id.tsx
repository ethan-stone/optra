"use client";

import { Copy } from "lucide-react";

export function CopyApiId(props: { id: string }) {
  return (
    <p className="flex w-fit items-center gap-1 rounded-md border border-gray-300 bg-stone-200 px-1 py-0.5 text-xs">
      {props.id}
      <Copy
        className="h-3 w-3 text-stone-900 hover:cursor-pointer"
        onClick={async () => {
          await navigator.clipboard.writeText(props.id);
        }}
      />
    </p>
  );
}
