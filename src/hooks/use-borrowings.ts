import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

export interface Borrowing {
  id: string;
  book_id: string;
  user_id: string;
  borrowed_at: string;
  due_date: string;
  returned_at: string | null;
  issued_by: string | null;
  created_at: string;
  book_title?: string;
  book_author?: string;
  member_name?: string;
}

export function useBorrowings(statusFilter?: "active" | "returned" | "overdue" | "all") {
  return useQuery({
    queryKey: ["borrowings", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      const qs = params.toString();
      return api.get<Borrowing[]>(`/api/borrowings${qs ? `?${qs}` : ""}`);
    },
  });
}

export function useIssueBorrow() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: { book_id: string; user_id: string; due_date: string; issued_by: string }) => {
      await api.post("/api/borrowings", data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["borrowings"] });
      qc.invalidateQueries({ queryKey: ["books"] });
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: "Book issued successfully" });
    },
    onError: (e) => toast({ title: "Failed to issue book", description: e.message, variant: "destructive" }),
  });
}

export function useReturnBook() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (borrowingId: string) => {
      await api.put(`/api/borrowings/${borrowingId}/return`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["borrowings"] });
      qc.invalidateQueries({ queryKey: ["books"] });
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: "Book returned successfully" });
    },
    onError: (e) => toast({ title: "Failed to return book", description: e.message, variant: "destructive" }),
  });
}
