import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "./dashboard";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return <DashboardShell view="settings" />;
}
