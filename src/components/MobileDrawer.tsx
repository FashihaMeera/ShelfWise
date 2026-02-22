import {
  LayoutDashboard,
  BookOpen,
  Users,
  ArrowLeftRight,
  CalendarClock,
  BarChart3,
  Settings,
  Library,
  X,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const allNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: ["admin", "librarian", "member"] },
  { title: "Books", url: "/books", icon: BookOpen, roles: ["admin", "librarian", "member"] },
  { title: "Members", url: "/members", icon: Users, roles: ["admin", "librarian"] },
  { title: "Borrow / Return", url: "/borrow-return", icon: ArrowLeftRight, roles: ["admin", "librarian"] },
  { title: "Reservations", url: "/reservations", icon: CalendarClock, roles: ["admin", "librarian", "member"] },
  { title: "Reports", url: "/reports", icon: BarChart3, roles: ["admin", "librarian"] },
  { title: "Settings", url: "/settings", icon: Settings, roles: ["admin", "librarian", "member"] },
];

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const { role } = useAuth();
  const navItems = allNavItems.filter(item => !role || item.roles.includes(role));

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-border md:hidden animate-in-up">
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Library className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">ShelfWise</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="py-3 px-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/"}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              activeClassName="bg-primary/10 text-primary"
              onClick={onClose}
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
}
