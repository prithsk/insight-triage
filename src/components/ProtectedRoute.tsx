import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, WifiOff } from "lucide-react";
import PendingApproval from "@/pages/PendingApproval";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Three distinct negative answers, deliberately not collapsed into one:
 *
 *   not signed in        → /login
 *   signed in, denied    → PendingApproval ("an admin must approve you")
 *   signed in, unknown   → the error state below ("we could not check")
 *
 * The third used to render as the second. `approved` starts at `false`, so any
 * failure to read the profile — offline, RLS denial, cold start — told an
 * approved radiologist their account was unapproved and offered them nothing but
 * a sign-out button. Telling someone the wrong reason they are locked out is
 * worse than telling them it broke.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, approved, profileError, refreshProfile, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">Checking your access…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-kx-surface text-kx-ink flex items-center justify-center px-8">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-kx-critical/10 flex items-center justify-center mx-auto mb-6">
            <WifiOff className="w-8 h-8 text-kx-critical-ink" aria-hidden />
          </div>
          <h1 className="font-display text-[28px] text-kx-ink mb-3 tracking-[-0.01em]">
            Couldn't verify your access
          </h1>
          <p className="text-[15px] text-kx-muted leading-relaxed mb-2">
            You're signed in, but we couldn't reach the server to check your clinical
            access. This is not a decision about your account — we don't know yet.
          </p>
          <p className="font-mono text-[12px] text-kx-muted/80 mb-8 break-words">
            {profileError}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => void refreshProfile()}
              className="px-6 py-2.5 rounded-[10px] bg-kx-accent3 text-white hover:opacity-90 transition-opacity text-[14px] font-medium"
            >
              Try again
            </button>
            <button
              onClick={signOut}
              className="px-6 py-2.5 rounded-[10px] border border-kx-border text-kx-muted hover:text-kx-ink hover:border-kx-muted transition-colors text-[14px] font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!approved) {
    return <PendingApproval />;
  }

  return <>{children}</>;
}
