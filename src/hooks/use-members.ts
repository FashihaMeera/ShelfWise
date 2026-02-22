import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Member {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  email: string | null;
  role: string;
  active_borrowings: number;
}

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, created_at")
        .order("created_at", { ascending: false });
      if (pErr) throw pErr;

      // Fetch roles
      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rErr) throw rErr;

      // Fetch active borrowings count per user
      const { data: borrowings, error: bErr } = await supabase
        .from("borrowings")
        .select("user_id")
        .is("returned_at", null);
      if (bErr) throw bErr;

      const roleMap = new Map(roles.map((r) => [r.user_id, r.role]));
      const borrowCountMap = new Map<string, number>();
      borrowings.forEach((b) => {
        borrowCountMap.set(b.user_id, (borrowCountMap.get(b.user_id) || 0) + 1);
      });

      return profiles.map((p) => ({
        id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        email: null, // email is in auth.users, not accessible via client
        role: roleMap.get(p.id) || "member",
        active_borrowings: borrowCountMap.get(p.id) || 0,
      })) as Member[];
    },
  });
}
