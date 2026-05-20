import { CheckCircle2, Eye, Pencil, Plus, Search, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";
import { Input } from "@/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { Skeleton } from "@/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import type { Issue, Pagination, Priority, Status } from "@/lib/api-client";
import { PriorityBadge, StatusBadge } from "./issue-badges";

export function IssuesTab({
  issues,
  loading,
  pagination,
  search,
  statusFilter,
  priorityFilter,
  onSearchChange,
  onStatusFilterChange,
  onPriorityFilterChange,
  onPageChange,
  onCreate,
  onView,
  onEdit,
  onResolve,
  onClose,
  onDelete,
}: {
  issues: Issue[];
  loading: boolean;
  pagination: Pagination;
  search: string;
  statusFilter: Status | "all";
  priorityFilter: Priority | "all";
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: Status | "all") => void;
  onPriorityFilterChange: (value: Priority | "all") => void;
  onPageChange: React.Dispatch<React.SetStateAction<number>>;
  onCreate: () => void;
  onView: (issue: Issue) => void;
  onEdit: (issue: Issue) => void;
  onResolve: (issue: Issue) => void;
  onClose: (issue: Issue) => void;
  onDelete: (issue: Issue) => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search by title..." className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as Status | "all")}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(value) => onPriorityFilterChange(value as Priority | "all")}>
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
          <Button onClick={onCreate} className="sm:ml-auto">
            <Plus className="mr-2 h-4 w-4" /> Create Issue
          </Button>
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
                <TableHead className="w-48 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell className="py-2"><Skeleton className="h-4 w-56" /></TableCell>
                    <TableCell className="py-2"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="py-2"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell className="py-2"><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                    <TableCell className="py-2"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell>
                      <div className="flex flex-nowrap justify-end gap-1">
                        <Skeleton className="h-7 w-7 rounded-md" />
                        <Skeleton className="h-7 w-7 rounded-md" />
                        <Skeleton className="h-7 w-7 rounded-md" />
                        <Skeleton className="h-7 w-7 rounded-md" />
                        <Skeleton className="h-7 w-7 rounded-md" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : issues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    No issues found.
                  </TableCell>
                </TableRow>
              ) : (
                issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="py-2 font-medium">{issue.title}</TableCell>
                    <TableCell className="max-w-44 truncate py-2 text-sm text-muted-foreground">
                      {issue.reporterName}
                    </TableCell>
                    <TableCell className="py-2"><PriorityBadge p={issue.priority} /></TableCell>
                    <TableCell className="py-2"><StatusBadge s={issue.status} /></TableCell>
                    <TableCell className="py-2 text-sm text-muted-foreground">
                      {new Date(issue.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-1 text-right">
                      <div className="inline-flex flex-nowrap items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(issue)} title="View"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(issue)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                        {issue.status !== "resolved" && issue.status !== "closed" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onResolve(issue)} title="Resolve"><CheckCircle2 className="h-4 w-4" /></Button>
                        )}
                        {issue.status !== "closed" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onClose(issue)} title="Close"><XCircle className="h-4 w-4" /></Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(issue)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            {pagination.totalItems === 0
              ? "0 results"
              : `Showing ${(pagination.currentPage - 1) * pagination.limit + 1}-${Math.min(pagination.currentPage * pagination.limit, pagination.totalItems)} of ${pagination.totalItems}`}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={!pagination.hasPreviousPage} onClick={() => onPageChange((value) => Math.max(1, value - 1))}>Previous</Button>
            <span className="text-muted-foreground">Page {pagination.currentPage} of {Math.max(1, pagination.totalPages)}</span>
            <Button variant="outline" size="sm" disabled={!pagination.hasNextPage} onClick={() => onPageChange((value) => value + 1)}>Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
