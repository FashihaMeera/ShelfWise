import { useState } from "react";
import { ArrowLeftRight, Plus, RotateCcw, CheckSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBorrowings, useReturnBook } from "@/hooks/use-borrowings";
import { useAuth } from "@/contexts/AuthContext";
import { IssueBorrowDialog } from "@/components/borrowings/IssueBorrowDialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type StatusFilter = "all" | "active" | "returned" | "overdue";

const BorrowReturn = () => {
  const { role } = useAuth();
  const isStaff = role === "admin" || role === "librarian";
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [issueOpen, setIssueOpen] = useState(false);

  const { data: borrowings, isLoading } = useBorrowings(statusFilter === "all" ? undefined : statusFilter);
  const returnBook = useReturnBook();

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkReturnLoading, setBulkReturnLoading] = useState(false);

  const getStatus = (b: { returned_at: string | null; due_date: string }) => {
    if (b.returned_at) return "returned";
    if (new Date(b.due_date) < new Date()) return "overdue";
    return "active";
  };

  // Only active/overdue items can be selected for bulk return
  const selectableItems = borrowings?.filter((b) => !b.returned_at) || [];

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === selectableItems.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableItems.map((b) => b.id)));
    }
  };

  const handleBulkReturn = async () => {
    if (selected.size === 0) return;
    setBulkReturnLoading(true);
    try {
      for (const id of selected) {
        await returnBook.mutateAsync(id);
      }
      toast({ title: `${selected.size} book(s) returned successfully` });
      setSelected(new Set());
    } catch (e: any) {
      toast({ title: "Bulk return failed", description: e.message, variant: "destructive" });
    }
    setBulkReturnLoading(false);
  };

  const allSelected = selectableItems.length > 0 && selected.size === selectableItems.length;

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

      {/* Bulk Action Bar */}
      {isStaff && selected.size > 0 && (
        <div className="glass rounded-lg p-3 flex items-center justify-between gap-3 border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{selected.size} borrowing(s) selected</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleBulkReturn} disabled={bulkReturnLoading}>
              <RotateCcw className="h-4 w-4 mr-1" />{bulkReturnLoading ? "Returning..." : "Return Selected"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              <X className="h-4 w-4 mr-1" />Clear
            </Button>
          </div>
        </div>
      )}

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
                {isStaff && (
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                )}
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
                const canSelect = status !== "returned";
                return (
                  <TableRow key={b.id}>
                    {isStaff && (
                      <TableCell>
                        {canSelect ? (
                          <Checkbox
                            checked={selected.has(b.id)}
                            onCheckedChange={() => toggleSelect(b.id)}
                          />
                        ) : <div className="w-4" />}
                      </TableCell>
                    )}
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
