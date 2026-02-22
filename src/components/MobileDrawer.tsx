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
  Bell,
  ClipboardList,
  Trophy,
  Gift,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const allNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["admin", "librarian", "member"] },
  { title: "Books", url: "/books", icon: BookOpen, roles: ["admin", "librarian", "member"] },
  { title: "Members", url: "/members", icon: Users, roles: ["admin", "librarian"] },
  { title: "Borrow / Return", url: "/borrow-return", icon: ArrowLeftRight, roles: ["admin", "librarian"] },
  { title: "Reservations", url: "/reservations", icon: CalendarClock, roles: ["admin", "librarian", "member"] },
  { title: "Reports", url: "/reports", icon: BarChart3, roles: ["admin", "librarian"] },
  { title: "Notifications", url: "/notifications", icon: Bell, roles: ["admin", "librarian", "member"] },
  { title: "Challenges", url: "/challenges", icon: Trophy, roles: ["admin", "librarian", "member"] },
  { title: "Requests", url: "/requests", icon: Gift, roles: ["admin", "librarian", "member"] },
  { title: "Activity Log", url: "/activity-log", icon: ClipboardList, roles: ["admin", "librarian"] },
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
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border md:hidden animate-in-up">
        <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Library className="h-4 w-4" />
            </div>
            <span className="font-bold text-lg text-sidebar-foreground">ShelfWise</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-sidebar-foreground/70">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="py-3 px-2 space-y-0.5 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
          {navItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/dashboard"}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
              activeClassName="bg-sidebar-primary/15 text-sidebar-primary"
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
