"use client";

import { Sidebar } from "@/components/ui/sidebar";
import { Copy } from "lucide-react";

export function Dashboard() {
  return (
    <Sidebar
      isCollapsed={false}
      links={[
        {
          title: "Inbox",
          label: "128",
          icon: Copy,
          variant: "default",
        },
        {
          title: "Drafts",
          label: "9",
          icon: Copy,
          variant: "ghost",
        },
      ]}
    />
  );
}
