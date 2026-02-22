import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
      let query = supabase
        .from("fines")
        .select("*, borrowings(book_id, books(title), profiles!borrowings_user_id_fkey(full_name))")
        .order("created_at", { ascending: false });

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map((f: any) => ({
        ...f,
        book_title: f.borrowings?.books?.title || "Unknown",
        member_name: f.borrowings?.profiles?.full_name || "Unknown",
      })) as Fine[];
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
      const { error } = await supabase
        .from("fines")
        .update({ waived: true, waived_by: waivedBy })
        .eq("id", id);
      if (error) throw error;
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
      const { error } = await supabase
        .from("fines")
        .update({ paid: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fines"] });
      toast({ title: "Fine marked as paid" });
    },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}
