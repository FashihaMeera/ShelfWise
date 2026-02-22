import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateMemberRole } from "@/hooks/use-member-role";
import { useAuth } from "@/contexts/AuthContext";

interface RoleSelectorProps {
  userId: string;
  currentRole: string;
}

export function RoleSelector({ userId, currentRole }: RoleSelectorProps) {
  const { role, user } = useAuth();
  const updateRole = useUpdateMemberRole();

  if (role !== "admin" || userId === user?.id) {
    return <span className="capitalize">{currentRole}</span>;
  }

  return (
    <Select
      value={currentRole}
      onValueChange={(newRole) => updateRole.mutate({ targetUserId: userId, newRole })}
      disabled={updateRole.isPending}
    >
      <SelectTrigger className="w-[120px] h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="member">Member</SelectItem>
        <SelectItem value="librarian">Librarian</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
      </SelectContent>
    </Select>
  );
}
