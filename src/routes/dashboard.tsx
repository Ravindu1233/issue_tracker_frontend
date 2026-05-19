import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  deleteIssue,
  exportIssues,
  getIssue,
  getIssueStats,
  listIssues,
  saveIssue,
  signOut,
  type Issue,
  type IssueStats,
  type Pagination,
  type Priority,
  type Status,
} from "@/lib/api-client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Textarea } from "@/components/textarea";
import { Card, CardContent } from "@/components/card";
import { Badge } from "@/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import {
  Bug,
  CheckCircle2,
  CircleDot,
  Clock,
  Download,
  Eye,
  Flag,
  ListChecks,
  LogOut,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

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
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.full_name || user?.email || "";

  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<IssueStats>(emptyStats);
  const [pagination, setPagination] = useState<Pagination>(emptyPagination);
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
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter]);

  const refreshStats = useCallback(() => {
    if (!user) return;
    getIssueStats()
      .then(setStats)
      .catch((err) => {
        toast.error(
          err instanceof Error ? err.message : "Unable to load stats",
        );
      });
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
        toast.error(
          err instanceof Error ? err.message : "Unable to load issues",
        );
      })
      .finally(() => setIssuesLoading(false));
  }, [debouncedSearch, page, priorityFilter, statusFilter, user]);

  useEffect(() => {
    refreshIssues();
  }, [refreshIssues]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const handleSave = async (draft: IssueDraft, id?: string) => {
    if (!user) return;
    setSubmitting(true);
    try {
      await saveIssue(user.id, draft, id);
      refreshIssues();
      refreshStats();
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
    await handleSave(
      {
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        status,
      },
      issue.id,
    );
  };

  const handleDelete = async (issue: Issue | null) => {
    if (!user || !issue) return;
    try {
      await deleteIssue(user.id, issue.id);
      refreshIssues();
      refreshStats();
      toast.success("Issue deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to delete issue",
      );
    }
  };

  const handleExport = async (format: "csv" | "json") => {
    try {
      const output = await exportIssues(format, {
        search: debouncedSearch,
        status: statusFilter,
        priority: priorityFilter,
      });
      const blob = new Blob([output], {
        type: format === "csv" ? "text/csv" : "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `issues.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to export issues",
      );
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

  if (authLoading || !user) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-[60px] items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Bug className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold">Tracely</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[280px] truncate text-sm font-medium text-muted-foreground sm:inline">
              {displayName}
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-900 text-[10px] font-semibold text-blue-100">
              {getInitials(displayName)}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                signOut();
                navigate({ to: "/login" });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-4 px-4 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-normal">Issues</h1>
            <p className="text-sm text-muted-foreground">
              Track and manage all your team's issues
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => handleExport("csv")}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport("json")}>
              <Download className="mr-2 h-4 w-4" /> JSON
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Create issue
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-5">
          <StatCard
            label="Total"
            value={stats.total}
            icon={<ListChecks className="h-5 w-5" />}
            color="text-slate-700 bg-slate-100 dark:text-slate-200 dark:bg-slate-800"
          />
          <StatCard
            label="Open"
            value={stats.open}
            icon={<CircleDot className="h-5 w-5" />}
            color="text-red-700 bg-red-50 dark:text-red-600 dark:bg-red-50"
          />
          <StatCard
            label="In progress"
            value={stats.in_progress}
            icon={<Clock className="h-5 w-5" />}
            color="text-sky-700 bg-sky-50 dark:text-sky-600 dark:bg-sky-50"
          />
          <StatCard
            label="Resolved"
            value={stats.resolved}
            icon={<CheckCircle2 className="h-5 w-5" />}
            color="text-green-700 bg-green-50 dark:text-green-700 dark:bg-green-50"
          />
          <StatCard
            label="Closed"
            value={stats.closed}
            icon={<XCircle className="h-5 w-5" />}
            color="text-zinc-700 bg-zinc-100 dark:text-zinc-200 dark:bg-zinc-800"
          />
        </div>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title..."
                  className="h-9 pl-9"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as Status | "all")}
              >
                <SelectTrigger className="h-9 justify-start gap-2 sm:w-36 [&>svg]:ml-auto">
                  <SlidersHorizontal className="h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={priorityFilter}
                onValueChange={(v) => setPriorityFilter(v as Priority | "all")}
              >
                <SelectTrigger className="h-9 justify-start gap-2 sm:w-32 [&>svg]:ml-auto">
                  <Flag className="h-4 w-4" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-44">Reporter</TableHead>
                    <TableHead className="w-32">Priority</TableHead>
                    <TableHead className="w-36">Status</TableHead>
                    <TableHead className="w-36">Created</TableHead>
                    <TableHead className="w-44 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-12 text-center text-muted-foreground"
                      >
                        {issuesLoading
                          ? "Loading issues..."
                          : "No issues found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    issues.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell className="font-medium">
                          {issue.title}
                        </TableCell>
                        <TableCell className="max-w-44 truncate text-sm text-muted-foreground">
                          {issue.reporterName}
                        </TableCell>
                        <TableCell>
                          <PriorityBadge p={issue.priority} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge s={issue.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(issue.created_at).toLocaleDateString(
                            undefined,
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex w-full items-center justify-end gap-1 whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openView(issue)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditing(issue);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {issue.status !== "resolved" &&
                              issue.status !== "closed" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    setPendingStatus({
                                      issue,
                                      status: "resolved",
                                    })
                                  }
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                            {issue.status !== "closed" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  setPendingStatus({ issue, status: "closed" })
                                }
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPendingDelete(issue)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                {pagination.totalItems === 0
                  ? "0 results"
                  : `Showing ${(pagination.currentPage - 1) * pagination.limit + 1}-${Math.min(
                      pagination.currentPage * pagination.limit,
                      pagination.totalItems,
                    )} of ${pagination.totalItems}`}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPreviousPage}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  Previous
                </Button>
                <span className="text-muted-foreground">
                  Page {pagination.currentPage} of{" "}
                  {Math.max(1, pagination.totalPages)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNextPage}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

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

      <IssueDetailsDialog
        issue={viewing}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
      />

      <AlertDialog
        open={!!pendingStatus}
        onOpenChange={(open) => !open && setPendingStatus(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Mark issue as{" "}
              {pendingStatus?.status === "closed" ? "Closed" : "Resolved"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This updates the issue status and keeps the issue available in the
              list and detail view.
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

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
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

function IssueDetailsDialog({
  issue,
  onOpenChange,
}: {
  issue: Issue | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!issue} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Issue Details</DialogTitle>
        </DialogHeader>
        {issue && (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Title</p>
              <p className="font-medium">{issue.title}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Reporter" value={issue.reporterName} />
              <Info
                label="Created"
                value={new Date(issue.created_at).toLocaleDateString(
                  undefined,
                  {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  },
                )}
              />
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Priority
                </p>
                <PriorityBadge p={issue.priority} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Status
                </p>
                <StatusBadge s={issue.status} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Description
              </p>
              <p className="whitespace-pre-wrap text-sm leading-6">
                {issue.description || "No description provided."}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${color}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-semibold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PriorityBadge({ p }: { p: Priority }) {
  const styles = {
    low: "bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200",
    medium:
      "bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300",
    high: "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300",
  }[p];
  return (
    <Badge variant="secondary" className={styles}>
      {p[0].toUpperCase() + p.slice(1)}
    </Badge>
  );
}

function StatusBadge({ s }: { s: Status }) {
  const map = {
    open: {
      label: "Open",
      cls: "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300",
    },
    in_progress: {
      label: "In Progress",
      cls: "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300",
    },
    resolved: {
      label: "Resolved",
      cls: "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300",
    },
    closed: {
      label: "Closed",
      cls: "bg-zinc-100 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200",
    },
  }[s];
  return (
    <Badge variant="secondary" className={map.cls}>
      {map.label}
    </Badge>
  );
}

type IssueDraft = {
  title: string;
  description: string;
  priority: Priority;
  status: Status;
};

function IssueDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Issue | null;
  onSubmit: (d: IssueDraft) => void;
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
  }, [open, initial]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = issueSchema.safeParse({
      title,
      description,
      priority,
      status,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
    });
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
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Login button broken on mobile"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Steps to reproduce, expected vs actual behavior..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as Priority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as Status)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
