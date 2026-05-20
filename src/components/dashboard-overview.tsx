import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import type { Issue, Priority, Status } from "@/lib/api-client";

const STATUS_COLORS: Record<Status, string> = {
  open: "#ef4444",
  in_progress: "#3b82f6",
  resolved: "#22c55e",
  closed: "#71717a",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "#94a3b8",
  medium: "#f59e0b",
  high: "#ef4444",
};

const STATUS_LABEL: Record<Status, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const STATUSES: Status[] = ["open", "in_progress", "resolved", "closed"];
const PRIORITIES: Priority[] = ["low", "medium", "high"];

export function DashboardOverview({ issues }: { issues: Issue[] }) {
  const statusData = useMemo(
    () =>
      STATUSES.map((status) => ({
        name: STATUS_LABEL[status],
        value: issues.filter((issue) => issue.status === status).length,
        color: STATUS_COLORS[status],
      })),
    [issues],
  );

  const priorityData = useMemo(
    () =>
      PRIORITIES.map((priority) => ({
        name: priority[0].toUpperCase() + priority.slice(1),
        value: issues.filter((issue) => issue.priority === priority).length,
        color: PRIORITY_COLORS[priority],
      })),
    [issues],
  );

  const trendData = useMemo(() => {
    const days = 14;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const buckets = Array.from({ length: days }, (_, idx) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (days - 1 - idx));
      return {
        date,
        label: date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        count: 0,
      };
    });

    for (const issue of issues) {
      const created = new Date(issue.created_at);
      created.setHours(0, 0, 0, 0);
      const diff = Math.floor(
        (today.getTime() - created.getTime()) / 86400000,
      );
      const idx = days - 1 - diff;
      if (idx >= 0 && idx < days) buckets[idx].count += 1;
    }

    return buckets.map((bucket) => ({
      label: bucket.label,
      count: bucket.count,
    }));
  }, [issues]);

  const recent = useMemo(
    () =>
      [...issues]
        .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
        .slice(0, 5),
    [issues],
  );

  return (
    <>
      <Card>
        <CardContent className="grid gap-3 p-3 lg:grid-cols-3">
          <ChartCard title="By status">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {statusData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="By priority">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Tooltip />
                <Pie
                  data={priorityData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {priorityData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
              {priorityData.map((item) => (
                <span key={item.name} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: item.color }}
                  />
                  {item.name} ({item.value})
                </span>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Created (last 14 days)">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" fontSize={11} interval={1} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Priority
              breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {priorityData.map((item) => {
              const total = issues.length || 1;
              const pct = Math.round((item.value / total) * 100);
              return (
                <div key={item.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground">
                      {item.value} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-blue-500" /> Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {recent.map((issue) => (
                  <li
                    key={issue.id}
                    className="flex items-start justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {issue.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Updated {new Date(issue.updated_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      style={{
                        background: `${STATUS_COLORS[issue.status]}22`,
                        color: STATUS_COLORS[issue.status],
                      }}
                    >
                      {STATUS_LABEL[issue.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

    </>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="mb-2 text-sm font-medium text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}
