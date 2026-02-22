import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useActivityLog } from "@/hooks/use-activity-log";
import { format } from "date-fns";

const ACTION_LABELS: Record<string, string> = {
  book_added: "Book Added",
  book_updated: "Book Updated",
  book_deleted: "Book Deleted",
  book_issued: "Book Issued",
  book_returned: "Book Returned",
  role_changed: "Role Changed",
};

const ActivityLog = () => {
  const [actionFilter, setActionFilter] = useState<string>("");
  const { data: activities, isLoading } = useActivityLog({
    action: actionFilter || undefined,
  });

  return (
    <div className="space-y-6 animate-in-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Activity Log</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">System audit trail of all actions.</p>
      </div>

      <Select value={actionFilter} onValueChange={(v) => setActionFilter(v === "all" ? "" : v)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="All Actions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Actions</SelectItem>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="glass rounded-lg p-12 text-center text-muted-foreground">Loading...</div>
      ) : !activities?.length ? (
        <div className="glass rounded-lg p-12 flex items-center justify-center min-h-[300px]">
          <div className="text-center text-muted-foreground">
            <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No activity yet</p>
          </div>
        </div>
      ) : (
        <div className="glass rounded-lg overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {ACTION_LABELS[a.action] || a.action.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{a.user_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                    {a.details ? Object.entries(a.details).map(([k, v]) => `${k}: ${v}`).join(", ") : "—"}
                  </TableCell>
                  <TableCell>{format(new Date(a.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
