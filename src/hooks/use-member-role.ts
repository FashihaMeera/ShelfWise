import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ targetUserId, newRole }: { targetUserId: string; newRole: string }) => {
      await api.put(`/api/members/${targetUserId}/role`, { role: newRole });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      toast({ title: "Role updated successfully" });
    },
    onError: (e) => toast({ title: "Failed to update role", description: e.message, variant: "destructive" }),
  });
}
