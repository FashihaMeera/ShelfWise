import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";

export function useLeaderboard(limit = 10) {
  return useQuery({
    queryKey: ["leaderboard", limit],
    queryFn: () =>
      api.get<{ rank: number; userId: string; name: string; avatar: string | null; booksRead: number }[]>(
        `/api/reports/leaderboard?limit=${limit}`
      ),
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
