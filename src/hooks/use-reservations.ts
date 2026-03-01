import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
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
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      const qs = params.toString();
      return api.get<Reservation[]>(`/api/reservations${qs ? `?${qs}` : ""}`);
    },
  });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: { book_id: string; user_id: string }) => {
      await api.post("/api/reservations", data);
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
      await api.put(`/api/reservations/${id}`, { status });
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
      await api.delete(`/api/reservations/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      toast({ title: "Reservation cancelled" });
    },
    onError: (e) => toast({ title: "Failed to cancel", description: e.message, variant: "destructive" }),
  });
}
