"use client";

import Link from "next/link";
import * as React from "react";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/shadcn-utils";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";

type Tab = {
  name: string;
  href: string;
  segment: string | null;
};

type Props = {
  tabs: Tab[];
};

export const Tabs: React.FC<React.PropsWithChildren<Props>> = ({ tabs }) => {
  return (
    <nav className="sticky top-0 z-50 bg-background py-2">
      <div className="flex w-full items-center overflow-x-auto">
        <ul className="flex flex-row gap-4">
          {tabs.map(({ name, href, segment }) => (
            <Tab key={name} name={name} href={href} segment={segment} />
          ))}
        </ul>
      </div>
      <Separator />
    </nav>
  );
};

const Tab: React.FC<Tab> = ({ name, href, segment }) => {
  const selectedSegment = useSelectedLayoutSegment();
  const router = useRouter();

  const active = segment === selectedSegment;
  return (
    <li
      className={cn("flex list-none rounded-t border-transparent", {
        "border-l border-r border-t border-stone-300 bg-stone-50 shadow":
          active,
      })}
    >
      <Link
        prefetch
        href={href}
        onClick={() => router.push(href)}
        className={cn(
          "flex items-center rounded-md px-3 py-2 text-sm font-medium",
        )}
      >
        {name}
      </Link>
    </li>
  );
};
