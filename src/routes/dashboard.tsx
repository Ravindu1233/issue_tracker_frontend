import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  FileText,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Pencil,
  Bug,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  deleteIssue,
  getIssue,
  getIssueStats,
  getSettings,
  listNotifications,
  listIssues,
  markAllNotificationsRead,
  markNotificationRead,
  saveIssue,
  signOut,
  updateIssueStatus,
  updateSettings,
  type AppNotification,
  type Issue,
  type IssueStats,
  type Pagination,
  type Priority,
  type Status,
  type UserSettings,
} from "@/lib/api-client";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";
import { DashboardTab } from "@/components/dashboard/dashboard-tab";
import { IssuesTab } from "@/components/dashboard/issues-tab";
import { PriorityBadge, StatusBadge } from "@/components/dashboard/issue-badges";
import { NotificationsBell } from "@/components/dashboard/notifications-bell";
import { ReportTab } from "@/components/dashboard/report-tab";
import { SettingsPanel } from "@/components/dashboard/settings-panel";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/alert-dialog";
import { Button } from "@/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/dialog";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { Textarea } from "@/components/textarea";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

type View = "overview" | "issues" | "report" | "settings";
const viewPaths = {
  overview: "/dashboard",
  issues: "/issues",
  report: "/reports",
  settings: "/settings",
} as const;
const viewLabels = {
  overview: "Dashboard",
  issues: "Issues",
  report: "Report",
  settings: "Settings",
} as const;

const issueSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
});

const emptyStats: IssueStats = {
  total: 0,
  open: 0,
  in_progress: 0,
  resolved: 0,
  closed: 0,
};

const emptyPagination: Pagination = {
  totalItems: 0,
  totalPages: 1,
  currentPage: 1,
  limit: PAGE_SIZE,
  hasNextPage: false,
  hasPreviousPage: false,
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function DashboardPage() {
  return <DashboardShell view="overview" />;
}

export function DashboardShell({ view }: { view: View }) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.full_name || user?.email || "";
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<IssueStats>(emptyStats);
  const [pagination, setPagination] = useState<Pagination>(emptyPagination);
  const [statsLoading, setStatsLoading] = useState(true);
  const [allIssuesLoading, setAllIssuesLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingSetting, setSavingSetting] = useState<"dark_mode" | "show_notifications" | "email_notifications" | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewing, setViewing] = useState<Issue | null>(null);
  const [editing, setEditing] = useState<Issue | null>(null);
  const [pendingStatus, setPendingStatus] = useState<{
    issue: Issue | null;
    draft?: IssueDraft;
    status: Extract<Status, "resolved" | "closed">;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Issue | null>(null);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, navigate, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [priorityFilter, statusFilter]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings?.dark_mode ?? false);
  }, [settings?.dark_mode]);

  const refreshStats = useCallback(() => {
    if (!user) return;
    setStatsLoading(true);
    getIssueStats()
      .then(setStats)
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Unable to load stats");
      })
      .finally(() => setStatsLoading(false));
  }, [user]);

  const refreshAllIssues = useCallback(async () => {
    if (!user) return;
    const nextIssues: Issue[] = [];
    let currentPage = 1;
    let hasNextPage = true;

    try {
      setAllIssuesLoading(true);
      while (hasNextPage) {
        const data = await listIssues({ page: currentPage, limit: 100 });
        nextIssues.push(...data.issues);
        hasNextPage = data.pagination.hasNextPage;
        currentPage += 1;
      }
      setAllIssues(nextIssues);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load dashboard data");
    } finally {
      setAllIssuesLoading(false);
    }
  }, [user]);

  const refreshIssues = useCallback(() => {
    if (!user) return;

    setIssuesLoading(true);
    listIssues({
      search: debouncedSearch,
      status: statusFilter,
      priority: priorityFilter,
      page,
      limit: PAGE_SIZE,
    })
      .then((data) => {
        setIssues(data.issues);
        setPagination(data.pagination);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Unable to load issues");
      })
      .finally(() => setIssuesLoading(false));
  }, [debouncedSearch, page, priorityFilter, statusFilter, user]);

  const refreshSettings = useCallback(() => {
    if (!user) return;
    setSettingsLoading(true);
    getSettings()
      .then(setSettings)
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Unable to load settings");
      })
      .finally(() => setSettingsLoading(false));
  }, [user]);

  const refreshNotifications = useCallback(() => {
    if (!user) return;
    setNotificationsLoading(true);
    listNotifications({ page: 1, limit: 20 })
      .then((data) => {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Unable to load notifications");
      })
      .finally(() => setNotificationsLoading(false));
  }, [user]);

  const refreshDashboard = useCallback(() => {
    refreshIssues();
    refreshStats();
    refreshAllIssues();
    refreshNotifications();
  }, [refreshAllIssues, refreshIssues, refreshNotifications, refreshStats]);

  useEffect(() => {
    refreshIssues();
  }, [refreshIssues]);

  useEffect(() => {
    refreshStats();
    refreshAllIssues();
    refreshSettings();
    refreshNotifications();
  }, [refreshAllIssues, refreshNotifications, refreshSettings, refreshStats]);

  useEffect(() => {
    if (!user) return;
    const timer = window.setInterval(refreshNotifications, 30000);
    return () => window.clearInterval(timer);
  }, [refreshNotifications, user]);

  const handleSettingChange = async (
    key: "dark_mode" | "show_notifications" | "email_notifications",
    value: boolean,
  ) => {
    if (!settings) return;

    const previous = settings;
    setSettings({ ...settings, [key]: value });
    setSavingSetting(key);

    try {
      const updated = await updateSettings({ [key]: value });
      setSettings(updated);
      refreshNotifications();
    } catch (err) {
      setSettings(previous);
      toast.error(err instanceof Error ? err.message : "Unable to update settings");
    } finally {
      setSavingSetting(null);
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, is_read: true } : notification,
      ),
    );
    setUnreadCount((current) => Math.max(0, current - 1));

    try {
      await markNotificationRead(id);
      refreshNotifications();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update notification");
      refreshNotifications();
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, is_read: true })),
    );
    setUnreadCount(0);

    try {
      await markAllNotificationsRead();
      refreshNotifications();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update notifications");
      refreshNotifications();
    }
  };

  const handleSave = async (draft: IssueDraft, id?: string) => {
    if (!user) return;
    setSubmitting(true);
    try {
      await saveIssue(user.id, draft, id);
      refreshDashboard();
      toast.success(id ? "Issue updated" : "Issue created");
      setDialogOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save issue");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (issue: Issue | null, status: Status) => {
    if (!issue) return;
    setSubmitting(true);
    try {
      await updateIssueStatus(issue.id, status);
      refreshDashboard();
      toast.success("Issue status updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update issue status");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (issue: Issue | null) => {
    if (!user || !issue) return;
    try {
      await deleteIssue(user.id, issue.id);
      refreshDashboard();
      toast.success("Issue deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to delete issue");
    }
  };

  const openView = async (issue: Issue) => {
    try {
      setViewing(await getIssue(issue.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load issue");
    }
  };

  const onSubmit = (draft: IssueDraft) => {
    const changedToFinal =
      draft.status !== editing?.status &&
      (draft.status === "resolved" || draft.status === "closed");

    if (changedToFinal) {
      setPendingStatus({ issue: editing, draft, status: draft.status });
      return;
    }

    handleSave(draft, editing?.id);
  };

  const handleLogout = () => {
    signOut();
    navigate({ to: "/login" });
  };

  if (authLoading || !user) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-60 shrink-0 border-r bg-background md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Bug className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold">Tracely</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <SideLink view="overview" active={view === "overview"} icon={<LayoutDashboard className="h-4 w-4" />}>
            Dashboard
          </SideLink>
          <SideLink view="issues" active={view === "issues"} icon={<ListChecks className="h-4 w-4" />}>
            Issues
          </SideLink>
          <SideLink view="report" active={view === "report"} icon={<FileText className="h-4 w-4" />}>
            Report
          </SideLink>
          <SideLink view="settings" active={view === "settings"} icon={<Settings className="h-4 w-4" />}>
            Settings
          </SideLink>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b bg-background px-3 py-3 sm:px-4 md:h-16 md:flex-nowrap md:py-0">
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Bug className="h-4 w-4" />
            </div>
            <span className="font-semibold">Tracely</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3 md:flex-none">
            <NotificationsBell
              notifications={notifications}
              unreadCount={unreadCount}
              loading={notificationsLoading}
              onOpen={refreshNotifications}
              onMarkRead={handleMarkNotificationRead}
              onMarkAllRead={handleMarkAllNotificationsRead}
            />
            <span className="hidden max-w-[280px] truncate text-sm font-medium text-muted-foreground sm:inline">
              {displayName}
            </span>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-900 text-[10px] font-semibold text-blue-100">
              {getInitials(displayName)}
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="px-2 sm:px-3">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b bg-background px-2 py-2 md:hidden">
          {(["overview", "issues", "report", "settings"] as const).map((item) => (
            <Button
              key={item}
              size="sm"
              variant={view === item ? "default" : "ghost"}
              asChild
            >
              <Link to={viewPaths[item]}>{viewLabels[item]}</Link>
            </Button>
          ))}
        </div>

        <main className="min-w-0 flex-1 p-3 pt-0 sm:p-4 sm:pt-0 md:p-8 md:pt-0">
          {view === "overview" && (
            <DashboardTab
              stats={stats}
              issues={allIssues}
              loading={statsLoading || allIssuesLoading}
              settings={settings}
              settingsLoading={settingsLoading}
              savingSetting={savingSetting}
              onSettingChange={handleSettingChange}
            />
          )}

          {view === "report" && <ReportTab issues={allIssues} loading={allIssuesLoading} />}

          {view === "settings" && (
            <SettingsPanel
              settings={settings}
              loading={settingsLoading}
              saving={savingSetting}
              onChange={handleSettingChange}
            />
          )}

          {view === "issues" && (
            <IssuesTab
              issues={issues}
              currentUserId={user.id}
              loading={issuesLoading}
              pagination={pagination}
              search={search}
              statusFilter={statusFilter}
              priorityFilter={priorityFilter}
              onSearchChange={setSearch}
              onStatusFilterChange={setStatusFilter}
              onPriorityFilterChange={setPriorityFilter}
              onPageChange={setPage}
              onCreate={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              onView={openView}
              onEdit={(issue) => {
                setEditing(issue);
                setDialogOpen(true);
              }}
              onResolve={(issue) => setPendingStatus({ issue, status: "resolved" })}
              onClose={(issue) => setPendingStatus({ issue, status: "closed" })}
              onDelete={setPendingDelete}
            />
          )}
        </main>
      </div>

      <IssueDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        initial={editing}
        onSubmit={onSubmit}
        submitting={submitting}
      />

      <ViewIssueDialog
        issue={viewing}
        currentUserId={user.id}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
        onEdit={(issue) => {
          setViewing(null);
          setEditing(issue);
          setDialogOpen(true);
        }}
      />

      <AlertDialog open={!!pendingStatus} onOpenChange={(open) => !open && setPendingStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Mark issue as {pendingStatus?.status === "closed" ? "Closed" : "Resolved"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This updates the issue status and keeps the issue available in reports and detail views.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingStatus?.draft) {
                  handleSave(pendingStatus.draft, editing?.id);
                } else if (pendingStatus) {
                  handleStatusChange(pendingStatus.issue, pendingStatus.status);
                }
                setPendingStatus(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this issue?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the issue from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleDelete(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SideLink({ view, active, icon }: { view: View; active: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      to={viewPaths[view]}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {icon}
      <span>{viewLabels[view]}</span>
    </Link>
  );
}

function ViewIssueDialog({
  issue,
  currentUserId,
  onOpenChange,
  onEdit,
}: {
  issue: Issue | null;
  currentUserId: string;
  onOpenChange: (value: boolean) => void;
  onEdit: (issue: Issue) => void;
}) {
  return (
    <Dialog open={!!issue} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{issue?.title}</DialogTitle>
        </DialogHeader>
        {issue && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <PriorityBadge p={issue.priority} />
              <StatusBadge s={issue.status} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Description</p>
              <p className="whitespace-pre-wrap text-sm">{issue.description || <span className="text-muted-foreground">No description provided.</span>}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Reporter</p>
                <p>{issue.reporterName}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Created</p>
                <p>{new Date(issue.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Updated</p>
                <p>{new Date(issue.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {issue && issue.user_id === currentUserId && (
            <Button onClick={() => onEdit(issue)}><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type IssueDraft = {
  title: string;
  description: string;
  priority: Priority;
  status: Status;
};

function IssueDialog({ open, onOpenChange, initial, onSubmit, submitting }: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  initial: Issue | null;
  onSubmit: (draft: IssueDraft) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<Status>("open");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? "");
      setDescription(initial?.description ?? "");
      setPriority(initial?.priority ?? "medium");
      setStatus(initial?.status ?? "open");
      setError(null);
    }
  }, [initial, open]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = issueSchema.safeParse({ title, description, priority, status });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    onSubmit({ title: title.trim(), description: description.trim(), priority, status });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Issue" : "Create Issue"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Login button broken on mobile" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Steps to reproduce, expected vs actual behavior..." />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  {initial && (
                    <>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

