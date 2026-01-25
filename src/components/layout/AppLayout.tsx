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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-border bg-surface flex items-center px-6 sticky top-0 z-50">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground tracking-tight">
            Kroix
          </span>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
            PILOT
          </span>
        </div>
        
        {/* Navigation */}
        <nav className="flex items-center gap-1 ml-10">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            
            return (
              <RouterNavLink
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-clear animate-pulse" />
            <span className="text-muted-foreground">System Active</span>
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
