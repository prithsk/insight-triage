import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileSearch, 
  BarChart3, 
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTheme } from "next-themes";

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reviewer", label: "Reviewer", icon: FileSearch },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };
  
  return (
    <div className="min-h-screen bg-landing-bg text-landing-heading overflow-x-hidden dark:bg-background dark:text-foreground">
      {/* Subtle grain texture overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-50 dark:opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-8 py-5 bg-landing-bg/80 backdrop-blur-sm border-b border-[rgba(0,0,0,0.06)] dark:bg-background/80 dark:border-border">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-12">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <span className="text-2xl font-serif font-semibold text-landing-heading tracking-tight dark:text-foreground">
                Kroix
              </span>
              <span className="text-[11px] font-medium text-landing-muted bg-landing-bg border border-[rgba(0,0,0,0.08)] px-2 py-0.5 rounded-md dark:text-muted-foreground dark:bg-muted dark:border-border">
                PILOT
              </span>
            </Link>
            
            {/* Navigation Links */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href === "/reviewer" && location.pathname.startsWith("/reviewer"));
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-[10px] text-[15px] transition-colors",
                      isActive 
                        ? "bg-landing-primary/10 text-landing-primary font-medium dark:bg-primary/10 dark:text-primary" 
                        : "text-landing-body hover:text-landing-heading hover:bg-landing-bg dark:text-muted-foreground dark:hover:text-foreground dark:hover:bg-muted"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          
          {/* Right side */}
          <div className="flex items-center gap-6">
            {/* Status Indicator */}
            <div className="flex items-center gap-2 text-[13px]">
              <span className="w-2 h-2 rounded-full bg-landing-primary animate-pulse dark:bg-primary" />
              <span className="text-landing-muted dark:text-muted-foreground">System Active</span>
            </div>
            
            <div className="h-5 w-px bg-[rgba(0,0,0,0.08)] dark:bg-border" />
            
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center h-9 w-9 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white text-landing-body hover:bg-landing-primary/10 hover:text-landing-primary transition-colors dark:border-border dark:bg-muted dark:text-muted-foreground dark:hover:bg-primary/10 dark:hover:text-primary"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
            
            <div className="h-5 w-px bg-[rgba(0,0,0,0.08)] dark:bg-border" />
            
            {/* User email */}
            {user && (
              <span className="text-[13px] text-landing-body dark:text-muted-foreground">
                {user.email}
              </span>
            )}
            
            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-[14px] text-landing-body hover:text-landing-heading hover:bg-landing-bg transition-colors dark:text-muted-foreground dark:hover:text-foreground dark:hover:bg-muted"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="pt-[72px]">
        {children}
      </main>
    </div>
  );
}
