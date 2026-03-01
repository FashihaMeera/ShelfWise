import { Sun, Moon, Bell, Menu, User, LogOut, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from "@/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";

interface TopNavbarProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onMobileMenuToggle: () => void;
}

export function TopNavbar({ theme, onToggleTheme, onMobileMenuToggle }: TopNavbarProps) {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: notifications } = useNotifications();
  const unreadCount = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "SW";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-20 h-14 border-b border-border bg-background/80 backdrop-blur-lg flex items-center px-4 gap-3">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMobileMenuToggle}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-1 ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-sm font-semibold">Notifications</p>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markAllAsRead.mutate()}>
                  <Check className="h-3 w-3 mr-1" />Mark all read
                </Button>
              )}
            </div>
            <DropdownMenuSeparator />
            <ScrollArea className="max-h-[300px]">
              {!notifications?.length ? (
                <div className="px-3 py-6 text-center text-muted-foreground text-sm">No notifications</div>
              ) : (
                notifications.slice(0, 20).map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className={`flex flex-col items-start gap-1 px-3 py-2 cursor-pointer ${!n.read ? "bg-primary/5" : ""}`}
                    onClick={() => {
                      if (!n.read) markAsRead.mutate(n.id);
                      if (n.link) navigate(n.link);
                    }}
                  >
                    <span className="text-sm font-medium">{n.title}</span>
                    <span className="text-xs text-muted-foreground">{n.message}</span>
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                  </DropdownMenuItem>
                ))
              )}
            </ScrollArea>
            {notifications && notifications.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="justify-center text-primary text-sm" onClick={() => navigate("/notifications")}>
                  View all notifications
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" onClick={onToggleTheme}>
          {theme === "light" ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium truncate">{profile?.full_name || "User"}</p>
              {role && <p className="text-xs text-muted-foreground capitalize">{role}</p>}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <User className="h-4 w-4 mr-2" />Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
