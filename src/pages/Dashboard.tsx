import { BookOpen, Users, ArrowLeftRight, CalendarClock, BarChart3, DollarSign, Trophy } from "lucide-react";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { useBorrowingTrends } from "@/hooks/use-reports";
import { useUnpaidFinesTotal } from "@/hooks/use-fines";
import { useAuth } from "@/contexts/AuthContext";
import { Leaderboard } from "@/components/reports/Leaderboard";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const Dashboard = () => {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: trends, isLoading: trendsLoading } = useBorrowingTrends(14);
  const { role } = useAuth();
  const isStaff = role === "admin" || role === "librarian";
  const unpaidFines = useUnpaidFinesTotal();

  const cards = [
    { label: "Total Books", value: stats?.totalBooks ?? "—", icon: BookOpen, color: "text-primary" },
    { label: "Active Members", value: stats?.activeMembers ?? "—", icon: Users, color: "text-[hsl(var(--success))]" },
    { label: "Borrowed Today", value: stats?.borrowedToday ?? "—", icon: ArrowLeftRight, color: "text-[hsl(var(--warning))]" },
    { label: "Overdue Items", value: stats?.overdueItems ?? "—", icon: CalendarClock, color: "text-destructive" },
  ];

  if (isStaff && unpaidFines > 0) {
    cards.push({ label: "Unpaid Fines", value: `$${unpaidFines.toFixed(2)}`, icon: DollarSign, color: "text-destructive" });
  }

  return (
    <div className="space-y-6 animate-in-up">
      <div>
         <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
         <p className="text-muted-foreground mt-1 text-sm sm:text-base">Welcome to ShelfWise. Your library at a glance.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((stat) => (
          <div key={stat.label} className="glass rounded-lg p-5 glass-hover">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="text-3xl font-bold mt-2">{isLoading ? "—" : stat.value}</p>
          </div>
        ))}
      </div>
      <div className="glass rounded-lg p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-base sm:text-lg font-semibold">Borrowing Trends (14 Days)</h2>
        </div>
        {trendsLoading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>
        ) : !trends?.some((t) => t.borrowed > 0 || t.returned > 0) ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No activity yet</p>
              <p className="text-sm">Charts will populate once books are borrowed.</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", color: "hsl(var(--popover-foreground))" }}
              />
              <Line type="monotone" dataKey="borrowed" stroke="hsl(239, 84%, 67%)" strokeWidth={2} name="Borrowed" dot={false} />
              <Line type="monotone" dataKey="returned" stroke="hsl(142, 71%, 45%)" strokeWidth={2} name="Returned" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Leaderboard Preview */}
      <div className="glass rounded-lg p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-[hsl(var(--warning))]" />
          <h2 className="text-base sm:text-lg font-semibold">Top Readers</h2>
        </div>
        <Leaderboard />
      </div>
    </div>
  );
};

export default Dashboard;
