import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useBorrowingTrends(days = 30) {
  return useQuery({
    queryKey: ["borrowing-trends", days],
    queryFn: () =>
      api.get<{ date: string; borrowed: number; returned: number }[]>(
        `/api/reports/borrowing-trends?days=${days}`
      ),
  });
}

export function usePopularBooks(limit = 10) {
  return useQuery({
    queryKey: ["popular-books", limit],
    queryFn: () =>
      api.get<{ title: string; author: string; count: number }[]>(
        `/api/reports/popular-books?limit=${limit}`
      ),
  });
}

export function useOverdueReport() {
  return useQuery({
    queryKey: ["overdue-report"],
    queryFn: () =>
      api.get<
        {
          id: string;
          book_title: string;
          book_author: string;
          member_name: string;
          due_date: string;
          days_overdue: number;
        }[]
      >("/api/reports/overdue"),
  });
}

export function useGenreDistribution() {
  return useQuery({
    queryKey: ["genre-distribution"],
    queryFn: () =>
      api.get<{ name: string; value: number }[]>("/api/reports/genre-distribution"),
  });
}
