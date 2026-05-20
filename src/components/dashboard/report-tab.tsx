import { useMemo, useState } from "react";
import { Download, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Skeleton } from "@/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { cn } from "@/lib/utils";
import type { Issue, Priority } from "@/lib/api-client";
import { PriorityBadge, StatusBadge } from "./issue-badges";

export function ReportTab({ issues, loading }: { issues: Issue[]; loading: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const [start, setStart] = useState(monthAgo);
  const [end, setEnd] = useState(today);
  const [preset, setPreset] = useState("30d");

  const applyPreset = (value: string) => {
    setPreset(value);
    const now = new Date();
    const nextEnd = now.toISOString().slice(0, 10);
    if (value === "7d") setStart(new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10));
    else if (value === "30d") setStart(new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10));
    else if (value === "90d") setStart(new Date(Date.now() - 89 * 86400000).toISOString().slice(0, 10));
    else if (value === "ytd") setStart(`${now.getFullYear()}-01-01`);
    setEnd(nextEnd);
  };

  const { current, previous, days } = useMemo(() => {
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);
    const spanMs = endDate.getTime() - startDate.getTime();
    const previousStart = new Date(startDate.getTime() - spanMs - 1);
    const previousEnd = new Date(startDate.getTime() - 1);
    const currentIssues = issues.filter((issue) => {
      const created = new Date(issue.created_at).getTime();
      return created >= startDate.getTime() && created <= endDate.getTime();
    });
    const previousIssues = issues.filter((issue) => {
      const created = new Date(issue.created_at).getTime();
      return created >= previousStart.getTime() && created <= previousEnd.getTime();
    });

    return { current: currentIssues, previous: previousIssues, days: Math.max(1, Math.round(spanMs / 86400000) + 1) };
  }, [end, issues, start]);

  const kpi = useMemo(() => {
    const resolved = current.filter((issue) => issue.status === "resolved" || issue.status === "closed");
    const open = current.filter((issue) => issue.status === "open").length;
    const inProgress = current.filter((issue) => issue.status === "in_progress").length;
    const high = current.filter((issue) => issue.priority === "high").length;
    const resolutionMs = resolved.map((issue) => +new Date(issue.updated_at) - +new Date(issue.created_at)).filter((value) => value >= 0);
    const avgHours = resolutionMs.length ? resolutionMs.reduce((sum, value) => sum + value, 0) / resolutionMs.length / 3600000 : 0;
    const resRate = current.length ? (resolved.length / current.length) * 100 : 0;

    return { created: current.length, resolved: resolved.length, open, inProgress, high, avgHours, resRate, backlog: open + inProgress };
  }, [current]);

  const trendPct = previous.length === 0 ? (current.length > 0 ? 100 : 0) : ((current.length - previous.length) / previous.length) * 100;

  const matrix = useMemo(
    () =>
      (["high", "medium", "low"] as Priority[]).map((priority) => {
        const subset = current.filter((issue) => issue.priority === priority);
        return {
          priority,
          open: subset.filter((issue) => issue.status === "open").length,
          in_progress: subset.filter((issue) => issue.status === "in_progress").length,
          resolved: subset.filter((issue) => issue.status === "resolved").length,
          closed: subset.filter((issue) => issue.status === "closed").length,
          total: subset.length,
        };
      }),
    [current],
  );

  const oldestOpen = useMemo(
    () =>
      [...current]
        .filter((issue) => issue.status !== "resolved" && issue.status !== "closed")
        .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
        .slice(0, 5),
    [current],
  );

  const exportCsv = () => {
    if (current.length === 0) {
      toast.error("No issues in selected range");
      return;
    }

    const header = ["Title", "Priority", "Status", "Created", "Updated", "Reporter", "Description"];
    const escape = (value: string) => `"${(value ?? "").replace(/"/g, '""')}"`;
    const rows = current.map((issue) =>
      [
        escape(issue.title),
        issue.priority,
        issue.status,
        new Date(issue.created_at).toISOString(),
        new Date(issue.updated_at).toISOString(),
        escape(issue.reporterName),
        escape(issue.description ?? ""),
      ].join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `issues-report-${start}-to-${end}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  };

  const fmtDate = (date: string) => new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Skeleton className="h-10 w-44" />
              <Skeleton className="h-9 w-[150px]" />
              <Skeleton className="h-9 w-[150px]" />
              <Skeleton className="h-9 w-28" />
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="space-y-3 p-5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex flex-col gap-3 p-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Issue Report</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Performance summary</h1>
            <p className="mt-1 text-sm text-muted-foreground">{fmtDate(start)} to {fmtDate(end)} - {days} day{days === 1 ? "" : "s"}</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex gap-1 rounded-md border bg-muted/30 p-1">
              {[
                { key: "7d", label: "7D" },
                { key: "30d", label: "30D" },
                { key: "90d", label: "90D" },
                { key: "ytd", label: "YTD" },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => applyPreset(item.key)}
                  className={cn("rounded px-3 py-1 text-xs font-medium transition-colors", preset === item.key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <Label htmlFor="r-start" className="text-xs text-muted-foreground">From</Label>
              <Input id="r-start" type="date" value={start} max={end} onChange={(event) => { setStart(event.target.value); setPreset("custom"); }} className="h-9 w-[150px]" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="r-end" className="text-xs text-muted-foreground">To</Label>
              <Input id="r-end" type="date" value={end} min={start} max={today} onChange={(event) => { setEnd(event.target.value); setPreset("custom"); }} className="h-9 w-[150px]" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Issues created" value={kpi.created} trendPct={trendPct} sub={`vs. previous ${days}d`} />
        <KpiCard label="Resolved or closed" value={kpi.resolved} accent="text-emerald-600" sub={`${kpi.resRate.toFixed(0)}% completion rate`} />
        <KpiCard label="Avg. resolution" value={kpi.avgHours < 24 ? `${kpi.avgHours.toFixed(1)}h` : `${(kpi.avgHours / 24).toFixed(1)}d`} sub="Time from open to final status" />
        <KpiCard label="Active backlog" value={kpi.backlog} accent={kpi.backlog > 0 ? "text-amber-600" : undefined} sub={`${kpi.open} open - ${kpi.inProgress} in progress - ${kpi.high} high`} />
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Breakdown by priority</CardTitle>
            <p className="text-xs text-muted-foreground">Distribution of issues across statuses, grouped by priority</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                    <TableHead className="text-right">In progress</TableHead>
                    <TableHead className="text-right">Resolved</TableHead>
                    <TableHead className="text-right">Closed</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-32">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matrix.map((row) => {
                    const share = current.length ? (row.total / current.length) * 100 : 0;
                    return (
                      <TableRow key={row.priority}>
                        <TableCell><PriorityBadge p={row.priority} /></TableCell>
                        <TableCell className="text-right tabular-nums">{row.open}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.in_progress}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.resolved}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.closed}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{row.total}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                              <div className="h-full bg-primary" style={{ width: `${share}%` }} />
                            </div>
                            <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{share.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Oldest unresolved</CardTitle>
            <p className="text-xs text-muted-foreground">Issues most at risk of aging out</p>
          </CardHeader>
          <CardContent>
            {oldestOpen.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No unresolved issues in this range.</p>
            ) : (
              <ul className="divide-y">
                {oldestOpen.map((issue) => {
                  const age = Math.floor((Date.now() - +new Date(issue.created_at)) / 86400000);
                  return (
                    <li key={issue.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{issue.title}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <PriorityBadge p={issue.priority} />
                          <StatusBadge s={issue.status} />
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums">{age}d</p>
                        <p className="text-xs text-muted-foreground">open</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Issue log</CardTitle>
            <p className="text-xs text-muted-foreground">{current.length} issue{current.length === 1 ? "" : "s"} in the selected range</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Title</TableHead>
                  <TableHead className="w-28">Priority</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-32">Created</TableHead>
                  <TableHead className="w-32">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">No issues in this range</TableCell></TableRow>
                ) : current.slice(0, 50).map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-medium">{issue.title}</TableCell>
                    <TableCell><PriorityBadge p={issue.priority} /></TableCell>
                    <TableCell><StatusBadge s={issue.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(issue.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(issue.updated_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {current.length > 50 && (
            <p className="mt-3 text-xs text-muted-foreground">Showing first 50 of {current.length}. Export CSV for the full list.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, sub, accent, trendPct }: { label: string; value: number | string; sub?: string; accent?: string; trendPct?: number }) {
  const TrendIcon = trendPct === undefined ? null : trendPct > 0 ? TrendingUp : trendPct < 0 ? TrendingDown : Minus;
  const trendColor = trendPct === undefined ? "" : trendPct > 0 ? "text-emerald-600" : trendPct < 0 ? "text-red-600" : "text-muted-foreground";

  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <p className={cn("text-xl font-semibold tabular-nums leading-tight", accent)}>{value}</p>
          {TrendIcon && (
            <span className={cn("flex items-center gap-0.5 text-xs font-medium", trendColor)}>
              <TrendIcon className="h-3 w-3" />
              {Math.abs(trendPct).toFixed(0)}%
            </span>
          )}
        </div>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
