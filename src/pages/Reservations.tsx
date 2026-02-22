import { useState } from "react";
import { CalendarClock, Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useReservations, useCreateReservation, useUpdateReservation, useCancelReservation } from "@/hooks/use-reservations";
import { useBooks } from "@/hooks/use-books";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]",
  ready: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
  fulfilled: "bg-secondary text-secondary-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

const Reservations = () => {
  const { user, role } = useAuth();
  const isStaff = role === "admin" || role === "librarian";
  const [statusFilter, setStatusFilter] = useState("all");
  const [reserveOpen, setReserveOpen] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState("");

  const { data: reservations, isLoading } = useReservations(statusFilter);
  const { data: books } = useBooks();
  const createReservation = useCreateReservation();
  const updateReservation = useUpdateReservation();
  const cancelReservation = useCancelReservation();

  const unavailableBooks = books?.filter((b) => b.available_copies === 0) ?? [];

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId || !user) return;
    await createReservation.mutateAsync({ book_id: selectedBookId, user_id: user.id });
    setSelectedBookId("");
    setReserveOpen(false);
  };

  return (
    <div className="space-y-6 animate-in-up">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reservations</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Reserve books that are currently unavailable.</p>
        </div>
        <Button onClick={() => setReserveOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Reserve Book
        </Button>
      </div>

      <div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="fulfilled">Fulfilled</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="glass rounded-lg p-12 text-center text-muted-foreground">Loading...</div>
      ) : !reservations?.length ? (
        <div className="glass rounded-lg p-12 flex items-center justify-center min-h-[300px]">
          <div className="text-center text-muted-foreground">
            <CalendarClock className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No reservations</p>
            <p className="text-sm">Reserve a book when all copies are borrowed.</p>
          </div>
        </div>
      ) : (
        <div className="glass rounded-lg overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Reserved</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.book_title || "Unknown"}</TableCell>
                  <TableCell>{r.member_name || "Unknown"}</TableCell>
                  <TableCell>{format(new Date(r.reserved_at), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[r.status] || ""}>
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {r.status === "pending" && isStaff && (
                      <Button variant="outline" size="sm" onClick={() => updateReservation.mutate({ id: r.id, status: "ready" })}>
                        <Check className="h-4 w-4 mr-1" /> Mark Ready
                      </Button>
                    )}
                    {r.status === "ready" && isStaff && (
                      <Button variant="outline" size="sm" onClick={() => updateReservation.mutate({ id: r.id, status: "fulfilled" })}>
                        <Check className="h-4 w-4 mr-1" /> Fulfill
                      </Button>
                    )}
                    {r.status === "pending" && (r.user_id === user?.id || isStaff) && (
                      <Button variant="ghost" size="sm" onClick={() => cancelReservation.mutate(r.id)}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={reserveOpen} onOpenChange={setReserveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reserve a Book</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReserve} className="space-y-4">
            <div className="space-y-2">
              <Label>Book (currently unavailable)</Label>
              <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                <SelectTrigger><SelectValue placeholder="Select book to reserve" /></SelectTrigger>
                <SelectContent>
                  {unavailableBooks.length > 0 ? (
                    unavailableBooks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.title} — {b.author}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>All books are currently available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setReserveOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!selectedBookId || createReservation.isPending}>Reserve</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reservations;
