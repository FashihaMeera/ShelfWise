import { useState } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotifications, useMarkAsRead, useMarkAllAsRead, useClearNotifications } from "@/hooks/use-notifications";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const clearRead = useClearNotifications();
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = notifications?.filter((n) => typeFilter === "all" || n.type === typeFilter) || [];
  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  const types = [...new Set(notifications?.map((n) => n.type) || [])];

  return (
    <div className="space-y-6 animate-in-up">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllAsRead.mutate()}>
              <Check className="h-4 w-4 mr-2" />Mark All Read
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => clearRead.mutate()}>
            <Trash2 className="h-4 w-4 mr-2" />Clear Read
          </Button>
        </div>
      </div>

      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {types.map((t) => (
            <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="glass rounded-lg p-12 text-center text-muted-foreground">Loading...</div>
      ) : !filtered.length ? (
        <div className="glass rounded-lg p-12 flex items-center justify-center min-h-[300px]">
          <div className="text-center text-muted-foreground">
            <Bell className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No notifications</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <div
              key={n.id}
              className={`glass rounded-lg p-4 cursor-pointer glass-hover ${!n.read ? "border-l-4 border-l-primary" : ""}`}
              onClick={() => {
                if (!n.read) markAsRead.mutate(n.id);
                if (n.link) navigate(n.link);
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="capitalize text-xs">{n.type.replace(/_/g, " ")}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                {!n.read && <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 mt-1" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
