import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format, startOfDay, eachDayOfInterval } from "date-fns";

export function useBorrowingTrends(days = 30) {
  return useQuery({
    queryKey: ["borrowing-trends", days],
    queryFn: async () => {
      const startDate = subDays(new Date(), days);
      const { data, error } = await supabase
        .from("borrowings")
        .select("borrowed_at, returned_at")
        .gte("borrowed_at", startDate.toISOString());
      if (error) throw error;

      const interval = eachDayOfInterval({ start: startOfDay(startDate), end: startOfDay(new Date()) });
      return interval.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const borrowed = data.filter((b) => format(new Date(b.borrowed_at), "yyyy-MM-dd") === dateStr).length;
        const returned = data.filter((b) => b.returned_at && format(new Date(b.returned_at), "yyyy-MM-dd") === dateStr).length;
        return { date: format(day, "MMM d"), borrowed, returned };
      });
    },
  });
}

export function usePopularBooks(limit = 10) {
  return useQuery({
    queryKey: ["popular-books", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("borrowings")
        .select("book_id, books(title, author)");
      if (error) throw error;

      const countMap = new Map<string, { title: string; author: string; count: number }>();
      data.forEach((b: any) => {
        const key = b.book_id;
        const existing = countMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          countMap.set(key, { title: b.books?.title || "Unknown", author: b.books?.author || "", count: 1 });
        }
      });

      return [...countMap.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    },
  });
}

export function useOverdueReport() {
  return useQuery({
    queryKey: ["overdue-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("borrowings")
        .select("*, books(title, author), profiles!borrowings_user_id_fkey(full_name)")
        .is("returned_at", null)
        .lt("due_date", new Date().toISOString())
        .order("due_date", { ascending: true });
      if (error) throw error;

      return data.map((b: any) => ({
        id: b.id,
        book_title: b.books?.title || "Unknown",
        book_author: b.books?.author || "",
        member_name: b.profiles?.full_name || "Unknown",
        due_date: b.due_date,
        days_overdue: Math.floor((Date.now() - new Date(b.due_date).getTime()) / (1000 * 60 * 60 * 24)),
      }));
    },
  });
}

export function useGenreDistribution() {
  return useQuery({
    queryKey: ["genre-distribution"],
    queryFn: async () => {
      const { data, error } = await supabase.from("books").select("genre, total_copies");
      if (error) throw error;

      const genreMap = new Map<string, number>();
      data.forEach((b) => {
        const genre = b.genre || "Uncategorized";
        genreMap.set(genre, (genreMap.get(genre) || 0) + b.total_copies);
      });

      return [...genreMap.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    },
  });
}
