import {
  LayoutDashboard,
  BookOpen,
  Users,
  ArrowLeftRight,
  CalendarClock,
  BarChart3,
  Settings,
  Library,
  PanelLeftClose,
  PanelLeft,
  Bell,
  ClipboardList,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
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
  { title: "Activity Log", url: "/activity-log", icon: ClipboardList, roles: ["admin", "librarian"] },
  { title: "Settings", url: "/settings", icon: Settings, roles: ["admin", "librarian", "member"] },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const { role } = useAuth();
  const navItems = allNavItems.filter(item => !role || item.roles.includes(role));

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 border-r border-border bg-sidebar transition-all duration-300 z-30",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex items-center h-14 px-4 border-b border-border">
        <Library className="h-6 w-6 text-primary shrink-0" />
        {!collapsed && <span className="ml-2.5 font-bold text-lg tracking-tight">ShelfWise</span>}
      </div>

      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/dashboard"}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
              collapsed && "justify-center px-0"
            )}
            activeClassName="bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-border">
        <Button variant="ghost" size="icon" onClick={onToggle} className="w-full flex justify-center">
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );
}
