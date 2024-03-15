"use client";

import { Sidebar } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Code, Settings } from "lucide-react";

export function DashboardSidebar() {
  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar
        isCollapsed={false}
        links={[
          {
            title: "APIs",
            icon: Code,
            variant: "ghost",
            href: "/dashboard/apis",
          },
          {
            title: "Settings",
            icon: Settings,
            variant: "ghost",
            href: "/dashboard/settings",
          },
        ]}
      />
    </TooltipProvider>
  );
}
