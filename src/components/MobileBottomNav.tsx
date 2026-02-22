import {
  LayoutDashboard,
  BookOpen,
  Users,
  ArrowLeftRight,
  CalendarClock,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";

const allMobileNavItems = [
  { title: "Home", url: "/dashboard", icon: LayoutDashboard, roles: ["admin", "librarian", "member"] },
  { title: "Books", url: "/books", icon: BookOpen, roles: ["admin", "librarian", "member"] },
  { title: "Members", url: "/members", icon: Users, roles: ["admin", "librarian"] },
  { title: "Borrow", url: "/borrow-return", icon: ArrowLeftRight, roles: ["admin", "librarian"] },
  { title: "Reserve", url: "/reservations", icon: CalendarClock, roles: ["admin", "librarian", "member"] },
];

export function MobileBottomNav() {
  const { role } = useAuth();
  const mobileNavItems = allMobileNavItems.filter(item => !role || item.roles.includes(role));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/90 backdrop-blur-lg">
      <div className="flex items-center justify-around h-14">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/dashboard"}
            className="flex flex-col items-center gap-0.5 text-muted-foreground text-[10px] font-medium py-1 px-2"
            activeClassName="text-primary"
          >
            <item.icon className="h-5 w-5" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
