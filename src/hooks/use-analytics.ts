import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface DashboardAnalytics {
  total_books: number;
  total_members: number;
  active_borrowings: number;
  borrowed_this_month: number;
  top_books: Array<{
    title: string;
    author: string;
    count: number;
  }>;
  genre_distribution: Array<{
    name: string;
    count: number;
  }>;
  top_readers: Array<{
    name: string;
    books: number;
  }>;
}

export function useDashboardAnalytics() {
  return useQuery({
    queryKey: ["dashboard-analytics"],
    queryFn: () => api.get<DashboardAnalytics>("/api/analytics/dashboard"),
  });
}

export interface GenreTrend {
  genre: string;
  total_borrows: number;
  active_borrows: number;
  popular_books: number;
}

export function useGenreTrends() {
  return useQuery<GenreTrend[]>({
    queryKey: ["genre-trends"],
    queryFn: () => api.get<GenreTrend[]>("/api/analytics/genre-trends"),
  });
}

export function useBookAnalytics(genre?: string) {
  return useQuery({
    queryKey: ["book-analytics", genre],
    queryFn: () => {
      const params = new URLSearchParams();
      if (genre) params.set("genre", genre);
      return api.get(
        `/api/analytics/books${params.toString() ? `?${params.toString()}` : ""}`
      );
    },
  });
}

export function useMemberAnalytics(topN: number = 50) {
  return useQuery({
    queryKey: ["member-analytics", topN],
    queryFn: () =>
      api.get(`/api/analytics/members?top_n=${topN}`),
  });
}
