import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RoleSelector } from "@/components/members/RoleSelector";
import { FinesTab } from "@/components/members/FinesTab";
import { format } from "date-fns";

function useMemberDetail(id: string) {
  return useQuery({
    queryKey: ["member-detail", id],
    queryFn: async () => {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).single(),
        supabase.from("user_roles").select("role").eq("user_id", id).single(),
      ]);
      if (profileRes.error) throw profileRes.error;
      return { ...profileRes.data, role: roleRes.data?.role || "member" };
    },
    enabled: !!id,
  });
}

function useMemberBorrowings(userId: string) {
  return useQuery({
    queryKey: ["member-borrowings", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("borrowings")
        .select("*, books(title, author)")
        .eq("user_id", userId)
        .order("borrowed_at", { ascending: false });
      if (error) throw error;
      return data.map((b: any) => ({ ...b, book_title: b.books?.title, book_author: b.books?.author }));
    },
    enabled: !!userId,
  });
}

function useMemberReservations(userId: string) {
  return useQuery({
    queryKey: ["member-reservations", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, books(title, author)")
        .eq("user_id", userId)
        .order("reserved_at", { ascending: false });
      if (error) throw error;
      return data.map((r: any) => ({ ...r, book_title: r.books?.title }));
    },
    enabled: !!userId,
  });
}

const MemberProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isStaff = role === "admin" || role === "librarian";

  const { data: member, isLoading } = useMemberDetail(id!);
  const { data: borrowings } = useMemberBorrowings(id!);
  const { data: reservations } = useMemberReservations(id!);

  const activeLoans = borrowings?.filter((b) => !b.returned_at) || [];
  const pastLoans = borrowings?.filter((b) => b.returned_at) || [];

  if (isLoading) return <div className="p-12 text-center text-muted-foreground">Loading...</div>;
  if (!member) return <div className="p-12 text-center text-muted-foreground">Member not found.</div>;

  return (
    <div className="space-y-6 animate-in-up">
      <Button variant="ghost" size="sm" onClick={() => navigate("/members")}>
        <ArrowLeft className="h-4 w-4 mr-2" />Back to Members
      </Button>

      <div className="glass rounded-lg p-6 flex items-center gap-4 flex-wrap">
        <Avatar className="h-16 w-16">
          <AvatarImage src={member.avatar_url || undefined} />
          <AvatarFallback className="text-xl">{(member.full_name || "?")[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{member.full_name || "Unnamed"}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">Joined {format(new Date(member.created_at), "MMM d, yyyy")}</span>
            {isStaff ? (
              <RoleSelector userId={id!} currentRole={member.role} />
            ) : (
              <Badge variant="secondary" className="capitalize">{member.role}</Badge>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="flex-wrap">
          <TabsTrigger value="active">Active Loans ({activeLoans.length})</TabsTrigger>
          <TabsTrigger value="history">History ({pastLoans.length})</TabsTrigger>
          <TabsTrigger value="reservations">Reservations ({reservations?.length || 0})</TabsTrigger>
          <TabsTrigger value="fines">Fines</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {!activeLoans.length ? (
            <p className="text-muted-foreground text-sm">No active loans.</p>
          ) : (
            <div className="glass rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Borrowed</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeLoans.map((b: any) => {
                    const overdue = new Date(b.due_date) < new Date();
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.book_title}</TableCell>
                        <TableCell>{format(new Date(b.borrowed_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>{format(new Date(b.due_date), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant={overdue ? "destructive" : "default"} className={!overdue ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]" : ""}>
                            {overdue ? "Overdue" : "Active"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {!pastLoans.length ? (
            <p className="text-muted-foreground text-sm">No borrowing history.</p>
          ) : (
            <div className="glass rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Borrowed</TableHead>
                    <TableHead>Returned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastLoans.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.book_title}</TableCell>
                      <TableCell>{format(new Date(b.borrowed_at), "MMM d, yyyy")}</TableCell>
                      <TableCell>{format(new Date(b.returned_at), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="reservations" className="mt-4">
          {!reservations?.length ? (
            <p className="text-muted-foreground text-sm">No reservations.</p>
          ) : (
            <div className="glass rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.book_title}</TableCell>
                      <TableCell>{format(new Date(r.reserved_at), "MMM d, yyyy")}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{r.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="fines" className="mt-4">
          <FinesTab userId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MemberProfile;
