import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Library, BookOpen, Users, BarChart3, Shield, ArrowRight, Sun, Moon, Sparkles } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  { icon: BookOpen, title: "Catalog Management", desc: "Organize your book collection with powerful search, tags, and ISBN auto-fill." },
  { icon: Users, title: "Member Portal", desc: "Track borrowings, reservations, reading lists, and challenges." },
  { icon: BarChart3, title: "Analytics & Reports", desc: "Export PDF reports, view trends, and celebrate top readers." },
  { icon: Shield, title: "Smart & Secure", desc: "Role-based access, barcode scanning, QR cards, and waitlists." },
];

export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Library className="h-4 w-4" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">ShelfWise</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="shrink-0">
              {theme === "light" ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
            </Button>
            <Button variant="ghost" asChild size="sm" className="hidden sm:inline-flex">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="glow-primary">
              <Link to="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="relative mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-20 text-center sm:py-28 lg:py-36 overflow-hidden">
          {/* Ambient background */}
          <div className="absolute inset-0 warm-gradient opacity-60" />
          <div className="absolute inset-0 bg-dots opacity-30" />

          <div className="relative z-10 flex flex-col items-center gap-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary font-medium">
              <Sparkles className="h-4 w-4" />
              Smart Library Management
            </div>
            <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.1]">
              Your library,{" "}
              <span className="text-primary relative">
                effortlessly
                <svg className="absolute -bottom-1 left-0 w-full h-2 text-primary/30" viewBox="0 0 200 8" fill="none">
                  <path d="M1 5.5C47 2 77 2 99 4C121 6 153 6 199 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </span>{" "}
              organized
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground leading-relaxed">
              ShelfWise helps you manage books, members, borrowings, and fines — all in one beautiful place. Built for libraries of every size.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" asChild className="gap-2 glow-primary px-6">
                <Link to="/register">
                  Create free account <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="px-6">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border warm-gradient">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4 sm:py-20">
            {features.map((f) => (
              <div key={f.title} className="group flex flex-col items-start gap-3 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 shadow-sm hover:shadow-lg hover:border-primary/20 transition-all duration-300 hover:-translate-y-1">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center">
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} ShelfWise. Crafted with care for libraries everywhere.</p>
      </footer>
    </div>
  );
}
