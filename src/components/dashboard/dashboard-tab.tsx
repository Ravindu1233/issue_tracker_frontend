import { CheckCircle2, CircleDot, Clock, ListChecks, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/card";
import { DashboardOverview } from "@/components/dashboard-overview";
import { SettingsPanel } from "@/components/dashboard/settings-panel";
import { Skeleton } from "@/components/skeleton";
import type { Issue, IssueStats, UserSettings } from "@/lib/api-client";

type DashboardTabProps = {
  stats: IssueStats;
  issues: Issue[];
  loading: boolean;
  settings: UserSettings | null;
  settingsLoading: boolean;
  savingSetting: "dark_mode" | "show_notifications" | "email_notifications" | null;
  onSettingChange: (
    key: "dark_mode" | "show_notifications" | "email_notifications",
    value: boolean,
  ) => void;
};

export function DashboardTab({
  stats,
  issues,
  loading,
  settings,
  settingsLoading,
  savingSetting,
  onSettingChange,
}: DashboardTabProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="flex items-center gap-3 p-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-10" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total" value={stats.total} icon={<ListChecks className="h-4 w-4" />} color="text-slate-700 bg-slate-100 dark:text-slate-200 dark:bg-slate-800" />
        <StatCard label="Open" value={stats.open} icon={<CircleDot className="h-4 w-4" />} color="text-red-600 bg-red-50 dark:bg-red-950/30" />
        <StatCard label="In Progress" value={stats.in_progress} icon={<Clock className="h-4 w-4" />} color="text-blue-600 bg-blue-50 dark:bg-blue-950/30" />
        <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle2 className="h-4 w-4" />} color="text-green-600 bg-green-50 dark:bg-green-950/30" />
        <StatCard label="Closed" value={stats.closed} icon={<XCircle className="h-4 w-4" />} color="text-zinc-700 bg-zinc-100 dark:text-zinc-200 dark:bg-zinc-800" />
      </div>
      <DashboardOverview issues={issues} />
      <SettingsPanel
        settings={settings}
        loading={settingsLoading}
        saving={savingSetting}
        onChange={onSettingChange}
      />
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${color}`}>{icon}</div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
