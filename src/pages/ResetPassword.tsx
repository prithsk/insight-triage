import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords don't match", description: "Please make sure your passwords match." });
      return;
    }
    if (password.length < 6) {
      toast({ variant: "destructive", title: "Password too short", description: "Password must be at least 6 characters." });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      setSuccess(true);
      toast({ title: "Password updated", description: "Your password has been successfully reset." });
      setTimeout(() => navigate("/login"), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-kx-canvas text-kx-ink font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-8 py-6 bg-kx-canvas/85 backdrop-blur-md border-b border-kx-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-kx-critical" />
            <span className="font-grotesk font-semibold tracking-tight text-[20px]">Kroix</span>
          </Link>
          <div className="flex items-center gap-8">
            <Link to="/about" className="text-kx-muted hover:text-kx-ink transition-colors text-[14px]">About</Link>
            <Link to="/contact" className="text-kx-muted hover:text-kx-ink transition-colors text-[14px]">Contact</Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <section className="relative min-h-screen flex items-center justify-center pt-24 pb-16 px-8">
        <Reveal className="relative z-10 w-full max-w-md" direction="none">
          <div className="bg-kx-surface rounded-2xl border border-kx-border p-8">
            <div className="text-center mb-8">
              <h1 className="font-grotesk text-[28px] leading-tight mb-2 tracking-[-0.01em]">
                {success ? "Password reset!" : "Set new password"}
              </h1>
              <p className="text-kx-muted text-[15px]">
                {success ? "Redirecting you to login..." : "Enter your new password below"}
              </p>
            </div>

            {success ? (
              <div className="flex flex-col items-center justify-center py-6">
                <div className="w-16 h-16 rounded-full bg-kx-critical/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-kx-critical" />
                </div>
                <p className="text-center text-kx-muted text-[15px]">
                  Your password has been successfully reset.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {!ready && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                    Validating your reset link... If this persists, request a new link.
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-kx-muted text-[14px]">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-kx-surface2 border-kx-border text-kx-ink placeholder:text-kx-muted h-11 rounded-[8px] hover:border-kx-critical/40 focus:border-kx-critical/40 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-kx-muted text-[14px]">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-kx-surface2 border-kx-border text-kx-ink placeholder:text-kx-muted h-11 rounded-[8px] hover:border-kx-critical/40 focus:border-kx-critical/40 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-7 py-3.5 bg-kx-ink text-kx-canvas rounded-[8px] text-[15px] font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      Update password
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          <p className="text-[13px] text-kx-muted text-center mt-6">
            Non-diagnostic workflow tool. For clinical decision support only.
          </p>
        </Reveal>
      </section>
    </div>
  );
}
