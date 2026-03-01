import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { TopNavbar } from "@/components/TopNavbar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { MobileDrawer } from "@/components/MobileDrawer";
import { useTheme } from "@/contexts/ThemeContext";

export function AppLayout() {
  const { theme, toggleTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <TopNavbar
          theme={theme}
          onToggleTheme={toggleTheme}
          onMobileMenuToggle={() => setMobileDrawerOpen(true)}
        />

        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>

      <MobileDrawer open={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)} />
      <MobileBottomNav />
    </div>
  );
}
