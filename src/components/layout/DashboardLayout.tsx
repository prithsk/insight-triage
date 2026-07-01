import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileSearch, BarChart3, LogOut, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WebGPUBackground } from "@/components/ui/WebGPUBackground";

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { href: "/reviewer",   label: "Reviewer",   icon: FileSearch },
  { href: "/analytics",  label: "Analytics",  icon: BarChart3 },
  { href: "/assistant",  label: "Assistant",  icon: BrainCircuit },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-landing-bg text-landing-heading overflow-x-hidden">
      {/* Interactive 3D WebGPU lattice background */}
      <WebGPUBackground />

      {/* Grain overlay for tactility */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025] z-[1]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-8 py-5 bg-landing-bg/75 backdrop-blur-md border-b border-[rgba(0,0,0,0.06)]">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-10">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <span className="text-2xl font-serif font-semibold text-landing-heading tracking-tight">
                Kroix
              </span>
              <span className="text-[11px] font-medium text-landing-muted bg-landing-bg border border-[rgba(0,0,0,0.08)] px-2 py-0.5 rounded-md">
                PILOT
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  (item.href === "/reviewer" && location.pathname.startsWith("/reviewer")) ||
                  (item.href === "/assistant" && location.pathname.startsWith("/assistant"));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-[10px] text-[15px] transition-all duration-150",
                      isActive
                        ? "bg-landing-primary/10 text-landing-primary font-medium"
                        : "text-landing-body hover:text-landing-heading hover:bg-white/60"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                    {item.href === "/assistant" && (
                      <span className="text-[9px] font-bold tracking-widest text-landing-primary/70 bg-landing-primary/10 px-1.5 py-0.5 rounded-full uppercase">
                        AI
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[13px]">
              <span className="w-2 h-2 rounded-full bg-landing-primary animate-pulse" />
              <span className="text-landing-muted">System Active</span>
            </div>

            <div className="h-5 w-px bg-[rgba(0,0,0,0.08)]" />

            {user && (
              <span className="text-[13px] text-landing-body">{user.email}</span>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-[14px] text-landing-body hover:text-landing-heading hover:bg-white/60 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-[72px] relative z-10">
        {children}
      </main>
    </div>
  );
}
