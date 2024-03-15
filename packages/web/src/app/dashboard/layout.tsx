import { type PropsWithChildren } from "react";
import { DashboardSidebar } from "./sidebar";

type DashboardPageProps = PropsWithChildren;

export default function DashboardPageLayout(props: DashboardPageProps) {
  return (
    <main className="relative flex min-h-screen flex-col">
      <DashboardSidebar />
      {props.children}
    </main>
  );
}
