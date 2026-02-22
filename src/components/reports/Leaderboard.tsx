import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";

export function useLeaderboard(limit = 10) {
  return useQuery({
    queryKey: ["leaderboard", limit],
    queryFn: async () => {
      const { data: borrowings, error } = await supabase
        .from("borrowings")
        .select("user_id")
        .not("returned_at", "is", null);
      if (error) throw error;

      const countMap = new Map<string, number>();
      borrowings.forEach((b) => {
        countMap.set(b.user_id, (countMap.get(b.user_id) || 0) + 1);
      });

      const sorted = [...countMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
      const userIds = sorted.map(([id]) => id);

      if (!userIds.length) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return sorted.map(([id, count], idx) => ({
        rank: idx + 1,
        userId: id,
        name: profileMap.get(id)?.full_name || "Unknown",
        avatar: profileMap.get(id)?.avatar_url || null,
        booksRead: count,
      }));
    },
  });
}

export function Leaderboard() {
  const { data: leaders, isLoading } = useLeaderboard();

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading...</p>;
  if (!leaders?.length) return <p className="text-muted-foreground text-sm">No reading activity yet.</p>;

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-2">
      {leaders.map((l) => (
        <div key={l.userId} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors">
          <span className="text-lg w-8 text-center font-bold">
            {l.rank <= 3 ? medals[l.rank - 1] : l.rank}
          </span>
          <Avatar className="h-8 w-8">
            <AvatarImage src={l.avatar || undefined} />
            <AvatarFallback className="text-xs">{(l.name || "?")[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="flex-1 text-sm font-medium truncate">{l.name}</span>
          <span className="text-sm text-muted-foreground">{l.booksRead} books</span>
        </div>
      ))}
    </div>
  );
}
