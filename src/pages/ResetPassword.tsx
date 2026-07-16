import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";

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
    <div className="min-h-screen bg-landing-bg text-landing-heading overflow-x-hidden">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <nav className="fixed top-0 left-0 right-0 z-40 px-8 py-6 bg-landing-bg/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <span className="text-2xl font-serif font-semibold text-landing-heading tracking-tight">Kroix</span>
          </Link>
          <div className="flex items-center gap-8">
            <Link to="/about" className="text-landing-body hover:text-landing-heading transition-colors text-[15px]">About</Link>
            <Link to="/contact" className="text-landing-body hover:text-landing-heading transition-colors text-[15px]">Contact</Link>
          </div>
        </div>
      </nav>

      <section className="relative min-h-screen flex items-center justify-center pt-24 pb-16 px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-landing-bg via-landing-bg to-[#E8EBE4]" />

        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-8 shadow-sm">
            <div className="text-center mb-8">
              <h1 className="font-serif text-[32px] leading-tight text-landing-heading mb-2 tracking-[-0.01em]">
                {success ? "Password reset" : "Set a new password"}
              </h1>
              <p className="text-landing-body text-[15px]">
                {success ? "Redirecting you to login…" : "Enter your new password below"}
              </p>
            </div>

            {success ? (
              <div className="flex flex-col items-center justify-center py-6">
                <div className="w-16 h-16 rounded-full bg-landing-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-landing-primary" />
                </div>
                <p className="text-center text-landing-body text-[15px]">
                  Your password has been successfully reset.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {!ready && (
                  <div className="p-3 rounded-[10px] bg-[#F5EDDB] border border-[#E7D9B4] text-[13px] text-[#8A6A1F]">
                    Validating your reset link… If this persists, request a new link.
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-landing-body text-[14px]">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-landing-bg/50 border-[rgba(0,0,0,0.06)] text-landing-heading placeholder:text-landing-muted h-11 rounded-[10px] hover:border-landing-primary focus:border-landing-primary focus-visible:ring-landing-primary/20 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-landing-body text-[14px]">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-landing-bg/50 border-[rgba(0,0,0,0.06)] text-landing-heading placeholder:text-landing-muted h-11 rounded-[10px] hover:border-landing-primary focus:border-landing-primary focus-visible:ring-landing-primary/20 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-7 py-3.5 bg-landing-primary text-white rounded-[10px] text-[15px] font-medium hover:bg-[#265A4C] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating…
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

          <p className="text-[13px] text-landing-muted text-center mt-6">
            Non-diagnostic workflow tool. For clinical decision support only.
          </p>
        </div>
      </section>
    </div>
  );
}
