import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "./dashboard";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  return <DashboardShell view="report" />;
}
