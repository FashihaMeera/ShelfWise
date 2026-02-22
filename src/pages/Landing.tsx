import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Library, BookOpen, Users, BarChart3, Shield, ArrowRight, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

const features = [
  { icon: BookOpen, title: "Catalog Management", desc: "Organize your entire book collection with powerful search and filters." },
  { icon: Users, title: "Member Portal", desc: "Track borrowings, reservations, and reading lists for every member." },
  { icon: BarChart3, title: "Analytics & Reports", desc: "Export reports, view trends, and gamify reading with leaderboards." },
  { icon: Shield, title: "Role-Based Access", desc: "Admins, librarians, and members — each with the right permissions." },
];

export default function Landing() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <Library className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold tracking-tight text-foreground">ShelfWise</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="shrink-0">
              {theme === "light" ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
            </Button>
            <Button variant="ghost" asChild size="sm" className="hidden sm:inline-flex">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-20 text-center sm:py-28 lg:py-36">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm text-muted-foreground">
            <Library className="h-4 w-4 text-primary" />
            Smart Library Management
          </div>
          <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Your library,{" "}
            <span className="text-primary">effortlessly</span> organized
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            ShelfWise helps you manage books, members, borrowings, and fines — all in one place. Built for libraries of every size.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" asChild className="gap-2">
              <Link to="/register">
                Create free account <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4 sm:py-20">
            {features.map((f) => (
              <div key={f.title} className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ShelfWise. All rights reserved.
      </footer>
    </div>
  );
}
