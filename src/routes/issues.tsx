import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "./dashboard";

export const Route = createFileRoute("/issues")({
  component: IssuesPage,
});

function IssuesPage() {
  return <DashboardShell view="issues" />;
}
