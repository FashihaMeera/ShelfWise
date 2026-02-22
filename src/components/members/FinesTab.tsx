import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFines, useWaiveFine, useMarkFinePaid } from "@/hooks/use-fines";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface FinesTabProps {
  userId: string;
}

export function FinesTab({ userId }: FinesTabProps) {
  const { role, user } = useAuth();
  const isStaff = role === "admin" || role === "librarian";
  const { data: fines, isLoading } = useFines(userId);
  const waiveFine = useWaiveFine();
  const markPaid = useMarkFinePaid();

  const total = fines?.filter((f) => !f.paid && !f.waived).reduce((s, f) => s + Number(f.amount), 0) || 0;

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading fines...</p>;
  if (!fines?.length) return <p className="text-muted-foreground text-sm">No fines. 🎉</p>;

  return (
    <div className="space-y-3">
      {total > 0 && (
        <div className="glass rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm font-medium">Outstanding Balance</span>
          <span className="text-lg font-bold text-destructive">₹{total.toFixed(2)}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Book</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              {isStaff && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {fines.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.book_title}</TableCell>
                <TableCell>₹{Number(f.amount).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={f.waived ? "secondary" : f.paid ? "default" : "destructive"}>
                    {f.waived ? "Waived" : f.paid ? "Paid" : "Unpaid"}
                  </Badge>
                </TableCell>
                <TableCell>{format(new Date(f.created_at), "MMM d, yyyy")}</TableCell>
                {isStaff && (
                  <TableCell className="text-right space-x-1">
                    {!f.paid && !f.waived && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => markPaid.mutate(f.id)}>Paid</Button>
                        <Button size="sm" variant="ghost" onClick={() => waiveFine.mutate({ id: f.id, waivedBy: user!.id })}>Waive</Button>
                      </>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
