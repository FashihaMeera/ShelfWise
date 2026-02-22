import { Users, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMembers } from "@/hooks/use-members";
import { useAuth } from "@/contexts/AuthContext";
import { RoleSelector } from "@/components/members/RoleSelector";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

const Members = () => {
  const { data: members, isLoading } = useMembers();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-in-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Members</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">View and manage library members.</p>
      </div>

      {isLoading ? (
        <div className="glass rounded-lg p-12 text-center text-muted-foreground">Loading...</div>
      ) : !members?.length ? (
        <div className="glass rounded-lg p-12 flex items-center justify-center min-h-[400px]">
          <div className="text-center text-muted-foreground">
            <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No members yet</p>
            <p className="text-sm">Members will appear here after registration.</p>
          </div>
        </div>
      ) : (
        <div className="glass rounded-lg overflow-x-auto">
          <Table className="min-w-[500px]">
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Active Borrowings</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id} className="cursor-pointer" onClick={() => navigate(`/members/${m.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.avatar_url || undefined} />
                        <AvatarFallback>{(m.full_name || "?")[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{m.full_name || "Unnamed"}</span>
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {isAdmin ? (
                      <RoleSelector userId={m.id} currentRole={m.role} />
                    ) : (
                      <Badge variant={m.role === "admin" ? "default" : m.role === "librarian" ? "secondary" : "outline"}>
                        {m.role}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{format(new Date(m.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell>{m.active_borrowings}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/members/${m.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Members;
