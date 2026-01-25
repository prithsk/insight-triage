import { ReactNode } from "react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileSearch,
  BarChart3,
  FileText,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reviewer", label: "Reviewer", icon: FileSearch },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/documents", label: "Documents", icon: FileText },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background bg-dot-pattern">
      {/* Top Navigation Bar - Glassmorphism */}
      <header className="h-14 border-b border-white/5 bg-surface/80 backdrop-blur-xl flex items-center px-6 sticky top-0 z-50">
        {/* Logo with orange gradient */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground tracking-tight">
            Kroix
          </span>
          <span className="text-[10px] font-medium text-primary bg-primary/15 border border-primary/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
            PILOT
          </span>
        </div>

        {/* Navigation with pill-shaped active indicators */}
        <nav className="flex items-center gap-1 ml-10">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href === "/reviewer" && location.pathname.startsWith("/reviewer"));
            const Icon = item.icon;

            return (
              <RouterNavLink
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </RouterNavLink>
            );
          })}
        </nav>

        {/* Right side - Theme toggle & status */}
        <div className="ml-auto flex items-center gap-4">
          <ThemeToggle />
          <div className="h-5 w-px bg-white/10" />
          <div className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full bg-clear/10 border border-clear/20">
            <span className="w-2 h-2 rounded-full bg-clear animate-pulse" />
            <span className="text-clear text-xs font-medium">System Active</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
