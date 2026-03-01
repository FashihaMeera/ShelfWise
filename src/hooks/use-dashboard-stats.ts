import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface DashboardStats {
  totalBooks: number;
  activeMembers: number;
  borrowedToday: number;
  overdueItems: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get<DashboardStats>("/api/dashboard/stats"),
  });
}
