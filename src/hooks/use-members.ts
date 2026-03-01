import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

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
    queryFn: () => api.get<Member[]>("/api/members"),
  });
}
