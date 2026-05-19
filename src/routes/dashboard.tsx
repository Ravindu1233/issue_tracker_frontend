import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  deleteIssue,
  listIssues,
  saveIssue,
  signOut,
  type Issue,
  type Priority,
  type Status,
} from "@/lib/local-store";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Textarea } from "@/components/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
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
  LogOut,
  Plus,
  Search,
  Pencil,
  Trash2,
  CircleDot,
  Clock,
  CheckCircle2,
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
  status: z.enum(["open", "in_progress", "resolved"]),
});

function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  const [issues, setIssues] = useState<Issue[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Issue | null>(null);
  const [pendingResolve, setPendingResolve] = useState<IssueDraft | null>(null);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refreshIssues = useCallback(() => {
    if (!user) return;

    setIssuesLoading(true);
    listIssues(user.id)
      .then(setIssues)
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Unable to load issues");
      })
      .finally(() => setIssuesLoading(false));
  }, [user]);

  useEffect(() => {
    refreshIssues();
  }, [refreshIssues]);

  const stats = useMemo(
    () => ({
      open: issues.filter((i) => i.status === "open").length,
      in_progress: issues.filter((i) => i.status === "in_progress").length,
      resolved: issues.filter((i) => i.status === "resolved").length,
    }),
    [issues],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return issues.filter(
      (i) =>
        (statusFilter === "all" || i.status === statusFilter) &&
        (priorityFilter === "all" || i.priority === priorityFilter) &&
        (!q || i.title.toLowerCase().includes(q)),
    );
  }, [issues, search, statusFilter, priorityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, priorityFilter]);

  const handleSave = async (draft: IssueDraft, id?: string) => {
    if (!user) return;
    setSubmitting(true);
    try {
      await saveIssue(user.id, draft, id);
      refreshIssues();
      toast.success(id ? "Issue updated" : "Issue created");
      setDialogOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save issue");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteIssue(user.id, id);
      refreshIssues();
      toast.success("Issue deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to delete issue");
    }
  };

  const handleLogout = () => {
    signOut();
    navigate({ to: "/login" });
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (issue: Issue) => {
    setEditing(issue);
    setDialogOpen(true);
  };

  const onSubmit = (draft: IssueDraft) => {
    const wasNotResolved = !editing || editing.status !== "resolved";
    if (draft.status === "resolved" && wasNotResolved) {
      setPendingResolve(draft);
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
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Bug className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold">Tracely</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-6 px-4 py-8">
        <div className="grid max-w-4xl gap-3 sm:grid-cols-3">
          <StatCard
            label="Open"
            value={stats.open}
            icon={<CircleDot className="h-5 w-5" />}
            color="text-red-600 bg-red-50 dark:bg-red-950/30"
          />
          <StatCard
            label="In Progress"
            value={stats.in_progress}
            icon={<Clock className="h-5 w-5" />}
            color="text-blue-600 bg-blue-50 dark:bg-blue-950/30"
          />
          <StatCard
            label="Resolved"
            value={stats.resolved}
            icon={<CheckCircle2 className="h-5 w-5" />}
            color="text-green-600 bg-green-50 dark:bg-green-950/30"
          />
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Issues</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track and manage all your team's issues
              </p>
            </div>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Create Issue
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title..."
                  className="pl-9"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as Status | "all")}
              >
                <SelectTrigger className="sm:w-44">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={priorityFilter}
                onValueChange={(v) => setPriorityFilter(v as Priority | "all")}
              >
                <SelectTrigger className="sm:w-44">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
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
                    <TableHead className="w-32">Priority</TableHead>
                    <TableHead className="w-36">Status</TableHead>
                    <TableHead className="w-36">Created</TableHead>
                    <TableHead className="w-28 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-12 text-center text-muted-foreground"
                      >
                        {issuesLoading
                          ? "Loading issues..."
                          : issues.length === 0
                            ? "No issues yet. Create your first one."
                            : "No issues match your filters."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageItems.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.title}</TableCell>
                        <TableCell>
                          <PriorityBadge p={i.priority} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge s={i.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(i.created_at).toLocaleDateString(
                            undefined,
                            { year: "numeric", month: "short", day: "numeric" },
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(i)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(i.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                {filtered.length === 0
                  ? "0 results"
                  : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
        initial={editing}
        onSubmit={onSubmit}
        submitting={submitting}
      />

      <AlertDialog
        open={!!pendingResolve}
        onOpenChange={(o) => !o && setPendingResolve(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark issue as Resolved?</AlertDialogTitle>
            <AlertDialogDescription>
              This will close the issue and move it to the Resolved column. You
              can still edit it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingResolve) handleSave(pendingResolve, editing?.id);
                setPendingResolve(null);
              }}
            >
              Yes, resolve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
