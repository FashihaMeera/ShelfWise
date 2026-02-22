import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [booksRes, membersRes, borrowingsRes] = await Promise.all([
        supabase.from("books").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("borrowings").select("id, borrowed_at, due_date, returned_at"),
      ]);

      const totalBooks = booksRes.count ?? 0;
      const activeMembers = membersRes.count ?? 0;

      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const borrowings = borrowingsRes.data ?? [];
      const borrowedToday = borrowings.filter((b) => {
        const d = new Date(b.borrowed_at);
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return dStr === todayStr;
      }).length;
      const overdueItems = borrowings.filter(
        (b) => !b.returned_at && new Date(b.due_date) < new Date()
      ).length;

      return { totalBooks, activeMembers, borrowedToday, overdueItems };
    },
  });
}
