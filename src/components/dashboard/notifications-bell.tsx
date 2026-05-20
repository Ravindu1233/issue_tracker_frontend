import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/lib/api-client";

type NotificationsBellProps = {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  onOpen: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
};

export function NotificationsBell({
  notifications,
  unreadCount,
  loading,
  onOpen,
  onMarkRead,
  onMarkAllRead,
}: NotificationsBellProps) {
  return (
    <Popover onOpenChange={(open) => open && onOpen()}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-9 w-9 shrink-0" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onMarkAllRead} disabled={unreadCount === 0}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Read all
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet</div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={cn(
                    "block w-full px-4 py-3 text-left transition-colors hover:bg-muted/70",
                    !notification.is_read && "bg-blue-50/70 dark:bg-blue-950/20",
                  )}
                  onClick={() => {
                    if (!notification.is_read) onMarkRead(notification.id);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-1 h-2 w-2 shrink-0 rounded-full",
                        notification.is_read ? "bg-transparent" : "bg-blue-600",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{notification.title}</span>
                      {notification.message && (
                        <span className="mt-1 block text-sm text-muted-foreground">{notification.message}</span>
                      )}
                      <span className="mt-2 block text-xs text-muted-foreground">
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
