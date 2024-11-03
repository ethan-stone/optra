"use client";

import Link from "next/link";
import { type LucideIcon, ChevronsUpDownIcon } from "lucide-react";
import { cn } from "@/utils/shadcn-utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { Button, buttonVariants } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Spinner } from "../icons/spinner";
import { useUser } from "../hooks/use-user";
import { createClient } from "@/utils/supabase";
import { useRouter } from "next/navigation";

interface SidebarProps {
  isCollapsed: boolean;
  links: {
    title: string;
    label?: string;
    icon: LucideIcon;
    variant: "default" | "ghost";
    href: string;
  }[];
}

export function Sidebar({ links, isCollapsed }: SidebarProps) {
  const supabase = createClient();
  const { data } = useUser();
  const router = useRouter();

  return (
    <aside
      data-collapsed={isCollapsed}
      className="group fixed inset-y-0 flex w-64 flex-col gap-4 py-2 data-[collapsed=true]:py-2"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="m-2 flex flex-row justify-between rounded-md bg-white text-black hover:bg-muted">
            {!data?.user ? <Spinner /> : "Personal Workspace"}
            <ChevronsUpDownIcon className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="absolute left-0 w-96 max-sm:left-0">
          <DropdownMenuLabel className="text-xs font-medium">
            Personal Account
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-medium">
            Workspaces
          </DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link href="/onboarding" className="flex items-center">
                <span>Create Workspace</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.refresh();
                }}
                className="flex items-center text-red-600"
              >
                <span>Sign Out</span>
              </button>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
        {links.map((link, index) =>
          isCollapsed ? (
            <Tooltip key={index} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  href={link.href}
                  className={cn(
                    buttonVariants({ variant: link.variant, size: "icon" }),
                    "h-9 w-9",
                    link.variant === "default" &&
                      "dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-white",
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  <span className="sr-only">{link.title}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-4">
                {link.title}
                {link.label && (
                  <span className="ml-auto text-muted-foreground">
                    {link.label}
                  </span>
                )}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link
              key={index}
              href={link.href}
              className={cn(
                buttonVariants({ variant: link.variant, size: "sm" }),
                link.variant === "default" &&
                  "dark:bg-muted dark:text-white dark:hover:bg-muted dark:hover:text-white",
                "justify-start",
              )}
            >
              <link.icon className="mr-2 h-4 w-4" />
              {link.title}
              {link.label && (
                <span
                  className={cn(
                    "ml-auto",
                    link.variant === "default" &&
                      "text-background dark:text-white",
                  )}
                >
                  {link.label}
                </span>
              )}
            </Link>
          ),
        )}
      </nav>
    </aside>
  );
}
