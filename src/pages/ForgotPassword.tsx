import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, ArrowRight, Mail } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      setSent(true);
      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-landing-bg text-landing-heading overflow-x-hidden">
      {/* Subtle grain texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-8 py-6 bg-landing-bg/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <span className="text-2xl font-serif font-semibold text-landing-heading tracking-tight">
              Kroix
            </span>
          </Link>
          <div className="flex items-center gap-8">
            <Link
              to="/about"
              className="text-landing-body hover:text-landing-heading transition-colors text-[15px]"
            >
              About
            </Link>
            <Link
              to="/contact"
              className="text-landing-body hover:text-landing-heading transition-colors text-[15px]"
            >
              Contact
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <section className="relative min-h-screen flex items-center justify-center pt-24 pb-16 px-8">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-landing-bg via-landing-bg to-[#E8EBE4]" />

        <div className="relative z-10 w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-8 shadow-sm">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="font-serif text-[32px] leading-tight text-landing-heading mb-2 tracking-[-0.01em]">
                Reset your password
              </h1>
              <p className="text-landing-body text-[15px]">
                {sent
                  ? "Check your email for a reset link"
                  : "Enter your email and we'll send you a reset link"}
              </p>
            </div>

            {sent ? (
              <div className="flex flex-col items-center justify-center py-6">
                <div className="w-16 h-16 rounded-full bg-landing-primary/10 flex items-center justify-center mb-4">
                  <Mail className="w-8 h-8 text-landing-primary" />
                </div>
                <p className="text-center text-landing-body text-[15px]">
                  If an account exists for <strong className="text-landing-heading">{email}</strong>, you'll receive an email with instructions to reset your password.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-landing-body text-[14px]">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="radiologist@hospital.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
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
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Footer */}
            <div className="mt-6 flex justify-center">
              <Link
                to="/login"
                className="flex items-center gap-2 text-[14px] text-landing-body hover:text-landing-heading transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>
            </div>
          </div>

          {/* Bottom note */}
          <p className="text-[13px] text-landing-muted text-center mt-6">
            Non-diagnostic workflow tool. For clinical decision support only.
          </p>
        </div>
      </section>
    </div>
  );
}
