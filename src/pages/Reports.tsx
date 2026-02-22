import { BarChart3, BookOpen, AlertTriangle, PieChart, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBorrowingTrends, usePopularBooks, useOverdueReport, useGenreDistribution } from "@/hooks/use-reports";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RePieChart, Pie, Cell } from "recharts";
import { ExportButtons } from "@/components/reports/ExportButtons";
import { Leaderboard } from "@/components/reports/Leaderboard";
import { format } from "date-fns";

const COLORS = [
  "hsl(239, 84%, 67%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)",
  "hsl(200, 70%, 50%)", "hsl(280, 60%, 55%)", "hsl(160, 60%, 45%)", "hsl(30, 80%, 55%)",
];

const Reports = () => {
  const { data: trends, isLoading: trendsLoading } = useBorrowingTrends(30);
  const { data: popular, isLoading: popularLoading } = usePopularBooks(10);
  const { data: overdue, isLoading: overdueLoading } = useOverdueReport();
  const { data: genres, isLoading: genresLoading } = useGenreDistribution();

  return (
    <div className="space-y-6 animate-in-up">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Library analytics and insights.</p>
        </div>
        <ExportButtons overdueData={overdue} popularData={popular} />
      </div>

      {/* Borrowing Trends */}
      <div className="glass rounded-lg p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Borrowing Trends (Last 30 Days)</h2>
        </div>
        {trendsLoading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", color: "hsl(var(--popover-foreground))" }} />
              <Line type="monotone" dataKey="borrowed" stroke="hsl(239, 84%, 67%)" strokeWidth={2} name="Borrowed" dot={false} />
              <Line type="monotone" dataKey="returned" stroke="hsl(142, 71%, 45%)" strokeWidth={2} name="Returned" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Popular Books */}
        <div className="glass rounded-lg p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Most Borrowed Books</h2>
          </div>
          {popularLoading ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : !popular?.length ? (
            <p className="text-muted-foreground text-sm">No borrowing data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={popular} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="category" dataKey="title" width={120} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", color: "hsl(var(--popover-foreground))" }} />
                <Bar dataKey="count" fill="hsl(239, 84%, 67%)" radius={[0, 4, 4, 0]} name="Times Borrowed" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Genre Distribution */}
        <div className="glass rounded-lg p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Collection by Genre</h2>
          </div>
          {genresLoading ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={250} className="sm:max-w-[60%]">
                <RePieChart>
                  <Pie data={genres} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} strokeWidth={2}>
                    {genres?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", color: "hsl(var(--popover-foreground))" }} />
                </RePieChart>
              </ResponsiveContainer>
              <div className="w-full sm:flex-1 space-y-1.5">
                {genres?.map((g, i) => (
                  <div key={g.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="truncate text-muted-foreground">{g.name}</span>
                    <span className="ml-auto font-medium">{g.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="glass rounded-lg p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-[hsl(var(--warning))]" />
          <h2 className="text-lg font-semibold">Most Active Readers</h2>
        </div>
        <Leaderboard />
      </div>

      {/* Overdue Report */}
      <div className="glass rounded-lg p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h2 className="text-lg font-semibold">Overdue Books</h2>
          {overdue && overdue.length > 0 && (
            <Badge variant="destructive">{overdue.length}</Badge>
          )}
        </div>
        {overdueLoading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : !overdue?.length ? (
          <p className="text-muted-foreground text-sm">No overdue books. 🎉</p>
        ) : (
          <div className="overflow-x-auto">
          <Table className="min-w-[500px]">
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Days Overdue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdue.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.book_title}</TableCell>
                  <TableCell>{item.member_name}</TableCell>
                  <TableCell>{format(new Date(item.due_date), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">{item.days_overdue} days</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
