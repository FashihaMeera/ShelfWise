import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
      let query = supabase
        .from("borrowings")
        .select("*, books(title, author), profiles!borrowings_user_id_fkey(full_name)")
        .order("borrowed_at", { ascending: false });

      if (statusFilter === "active") {
        query = query.is("returned_at", null);
      } else if (statusFilter === "returned") {
        query = query.not("returned_at", "is", null);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = data.map((b: any) => ({
        ...b,
        book_title: b.books?.title,
        book_author: b.books?.author,
        member_name: b.profiles?.full_name,
      }));

      if (statusFilter === "overdue") {
        results = results.filter(
          (b) => !b.returned_at && new Date(b.due_date) < new Date()
        );
      }

      return results as Borrowing[];
    },
  });
}

export function useIssueBorrow() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: { book_id: string; user_id: string; due_date: string; issued_by: string }) => {
      const { error } = await supabase.from("borrowings").insert(data);
      if (error) throw error;
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
      const { error } = await supabase
        .from("borrowings")
        .update({ returned_at: new Date().toISOString() })
        .eq("id", borrowingId);
      if (error) throw error;
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
