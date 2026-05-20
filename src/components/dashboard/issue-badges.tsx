import { Badge } from "@/components/badge";
import type { Priority, Status } from "@/lib/api-client";

export function PriorityBadge({ p }: { p: Priority }) {
  const styles = {
    low: "bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200",
    medium: "bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300",
    high: "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300",
  }[p];

  return <Badge variant="secondary" className={styles}>{p[0].toUpperCase() + p.slice(1)}</Badge>;
}

export function StatusBadge({ s }: { s: Status }) {
  const map = {
    open: { label: "Open", cls: "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300" },
    in_progress: { label: "In Progress", cls: "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300" },
    resolved: { label: "Resolved", cls: "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300" },
    closed: { label: "Closed", cls: "bg-zinc-100 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200" },
  }[s];

  return <Badge variant="secondary" className={map.cls}>{map.label}</Badge>;
}
