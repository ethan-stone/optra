import { type PropsWithChildren } from "react";
import { Dashboard } from "./sidebar";

type DashboardPageProps = PropsWithChildren;

export default function DashboardPageLayout(props: DashboardPageProps) {
  return (
    <main className="flex min-h-screen items-center">
      <Dashboard />
      {props.children}
    </main>
  );
}
