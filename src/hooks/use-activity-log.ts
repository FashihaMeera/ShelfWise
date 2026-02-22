import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      let query = supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(filters?.limit || 100);

      if (filters?.action) {
        query = query.eq("action", filters.action);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profile names for user_ids
      const userIds = [...new Set(data.filter((a) => a.user_id).map((a) => a.user_id!))];
      let nameMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        profiles?.forEach((p) => nameMap.set(p.id, p.full_name || "Unknown"));
      }

      return data.map((a) => ({
        ...a,
        user_name: a.user_id ? nameMap.get(a.user_id) || "Unknown" : "System",
      })) as ActivityEntry[];
    },
  });
}
