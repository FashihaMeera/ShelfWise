import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

export interface Fine {
  id: string;
  borrowing_id: string;
  user_id: string;
  amount: number;
  paid: boolean;
  waived: boolean;
  waived_by: string | null;
  created_at: string;
  book_title?: string;
  member_name?: string;
}

export function useFines(userId?: string) {
  return useQuery({
    queryKey: ["fines", userId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userId) params.set("user_id", userId);
      const qs = params.toString();
      return api.get<Fine[]>(`/api/fines${qs ? `?${qs}` : ""}`);
    },
  });
}

export function useUnpaidFinesTotal() {
  const { data: fines } = useFines();
  if (!fines) return 0;
  return fines
    .filter((f) => !f.paid && !f.waived)
    .reduce((sum, f) => sum + Number(f.amount), 0);
}

export function useWaiveFine() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, waivedBy }: { id: string; waivedBy: string }) => {
      await api.put(`/api/fines/${id}/waive`, { waived_by: waivedBy });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fines"] });
      toast({ title: "Fine waived" });
    },
    onError: (e) => toast({ title: "Failed to waive fine", description: e.message, variant: "destructive" }),
  });
}

export function useMarkFinePaid() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/api/fines/${id}/pay`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fines"] });
      toast({ title: "Fine marked as paid" });
    },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}
