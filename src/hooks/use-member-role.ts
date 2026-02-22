import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ targetUserId, newRole }: { targetUserId: string; newRole: string }) => {
      const { data, error } = await supabase.functions.invoke("manage-role", {
        body: { target_user_id: targetUserId, new_role: newRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      toast({ title: "Role updated successfully" });
    },
    onError: (e) => toast({ title: "Failed to update role", description: e.message, variant: "destructive" }),
  });
}
