"use client";

import { CopyIcon } from "@/components/icons/copy";
import { Separator } from "@/components/ui/separator";

type PermissionItemProps = {
  name: string;
  description: string | null;
};

export function PermissionItem(props: PermissionItemProps) {
  return (
    <div className="hover:bg-stone-100">
      <div className="flex flex-row items-center justify-between space-y-1 px-4 py-5">
        <div className="flex flex-col gap-2">
          <div className="flex flex-row items-center gap-1">
            <h4 className="rounded font-mono font-medium leading-none">
              {props.name}
            </h4>
            <button onClick={() => navigator.clipboard.writeText(props.name)}>
              <CopyIcon />
            </button>
          </div>
          <h4 className="text-sm font-light leading-none">
            {props.description}
          </h4>
        </div>
      </div>
      <Separator />
    </div>
  );
}
