import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Reservation {
  id: string;
  book_id: string;
  user_id: string;
  reserved_at: string;
  status: string;
  notified_at: string | null;
  expires_at: string | null;
  created_at: string;
  book_title?: string;
  book_author?: string;
  member_name?: string;
}

export function useReservations(statusFilter?: string) {
  return useQuery({
    queryKey: ["reservations", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("reservations")
        .select("*, books(title, author), profiles!reservations_user_id_fkey(full_name)")
        .order("reserved_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map((r: any) => ({
        ...r,
        book_title: r.books?.title,
        book_author: r.books?.author,
        member_name: r.profiles?.full_name,
      })) as Reservation[];
    },
  });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: { book_id: string; user_id: string }) => {
      const { error } = await supabase.from("reservations").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      toast({ title: "Book reserved successfully" });
    },
    onError: (e) => toast({ title: "Failed to reserve", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateReservation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      toast({ title: "Reservation updated" });
    },
    onError: (e) => toast({ title: "Failed to update", description: e.message, variant: "destructive" }),
  });
}

export function useCancelReservation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reservations").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      toast({ title: "Reservation cancelled" });
    },
    onError: (e) => toast({ title: "Failed to cancel", description: e.message, variant: "destructive" }),
  });
}
