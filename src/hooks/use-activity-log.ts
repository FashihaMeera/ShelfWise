import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface ActivityEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
  user_name?: string;
}

export function useActivityLog(filters?: { action?: string; limit?: number }) {
  return useQuery({
    queryKey: ["activity-log", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.action) params.set("action", filters.action);
      if (filters?.limit) params.set("limit", String(filters.limit));
      const qs = params.toString();
      return api.get<ActivityEntry[]>(`/api/activity-log${qs ? `?${qs}` : ""}`);
    },
  });
}
