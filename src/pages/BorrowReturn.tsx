import { useState } from "react";
import { ArrowLeftRight, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBorrowings, useReturnBook } from "@/hooks/use-borrowings";
import { useAuth } from "@/contexts/AuthContext";
import { IssueBorrowDialog } from "@/components/borrowings/IssueBorrowDialog";
import { format } from "date-fns";

type StatusFilter = "all" | "active" | "returned" | "overdue";

const BorrowReturn = () => {
  const { role } = useAuth();
  const isStaff = role === "admin" || role === "librarian";

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [issueOpen, setIssueOpen] = useState(false);

  const { data: borrowings, isLoading } = useBorrowings(statusFilter === "all" ? undefined : statusFilter);
  const returnBook = useReturnBook();

  const getStatus = (b: { returned_at: string | null; due_date: string }) => {
    if (b.returned_at) return "returned";
    if (new Date(b.due_date) < new Date()) return "overdue";
    return "active";
  };

  return (
    <div className="space-y-6 animate-in-up">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Borrow & Return</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Issue and return books.</p>
        </div>
        {isStaff && <Button onClick={() => setIssueOpen(true)}><Plus className="h-4 w-4 mr-2" />Issue Book</Button>}
      </div>

      <div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="glass rounded-lg p-12 text-center text-muted-foreground">Loading...</div>
      ) : !borrowings?.length ? (
        <div className="glass rounded-lg p-12 flex items-center justify-center min-h-[300px]">
          <div className="text-center text-muted-foreground">
            <ArrowLeftRight className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No transactions yet</p>
            <p className="text-sm">Borrowing and return records will show here.</p>
          </div>
        </div>
      ) : (
        <div className="glass rounded-lg overflow-x-auto">
          <Table className="min-w-[650px]">
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Borrowed</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                {isStaff && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {borrowings.map((b) => {
                const status = getStatus(b);
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.book_title || "Unknown"}</TableCell>
                    <TableCell>{b.member_name || "Unknown"}</TableCell>
                    <TableCell>{format(new Date(b.borrowed_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>{format(new Date(b.due_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge
                        variant={status === "returned" ? "secondary" : status === "overdue" ? "destructive" : "default"}
                        className={status === "active" ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]" : ""}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                    </TableCell>
                    {isStaff && (
                      <TableCell className="text-right">
                        {status !== "returned" && (
                          <Button variant="outline" size="sm" onClick={() => returnBook.mutate(b.id)} disabled={returnBook.isPending}>
                            <RotateCcw className="h-4 w-4 mr-1" /> Return
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <IssueBorrowDialog open={issueOpen} onOpenChange={setIssueOpen} />
    </div>
  );
};

export default BorrowReturn;
