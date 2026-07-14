import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight } from "lucide-react";
import {
  validateEmail,
  sanitizeString,
  detectSQLInjection,
  detectXSS,
  checkRateLimit,
  logSecurityEvent,
} from "@/lib/security";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [institution, setInstitution] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting: 3 signups per 5 minutes
    const rateLimit = checkRateLimit("signup", 3, 300000);
    if (!rateLimit.allowed) {
      toast({
        variant: "destructive",
        title: "Too many attempts",
        description: `Please wait ${Math.ceil(rateLimit.resetInMs / 1000)} seconds before trying again.`,
      });
      logSecurityEvent("rate_limit", { action: "signup" });
      return;
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      toast({
        variant: "destructive",
        title: "Invalid email",
        description: emailValidation.error,
      });
      return;
    }

    // Validate password length
    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Invalid password",
        description: "Password must be at least 6 characters.",
      });
      return;
    }

    // Check all inputs for injection attacks
    const inputs = [displayName, specialty, institution, password];
    for (const input of inputs) {
      if (detectSQLInjection(input) || detectXSS(input)) {
        logSecurityEvent("sql_injection", { action: "signup" });
        toast({
          variant: "destructive",
          title: "Invalid input",
          description: "Your input contains invalid characters.",
        });
        return;
      }
    }

    // Sanitize text inputs
    const sanitizedDisplayName = sanitizeString(displayName);
    const sanitizedSpecialty = sanitizeString(specialty);
    const sanitizedInstitution = sanitizeString(institution);

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: emailValidation.sanitized,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          display_name: sanitizedDisplayName,
          specialty: sanitizedSpecialty,
          institution: sanitizedInstitution,
        },
      },
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: error.message,
      });
    } else {
      // Update profile with additional fields
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({
            specialty: sanitizedSpecialty,
            institution: sanitizedInstitution,
          })
          .eq("user_id", user.id);
      }

      toast({
        title: "Account created!",
        description: "Welcome to Kroix.",
      });
      navigate("/dashboard");
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
      <section className="relative min-h-screen flex items-center justify-center pt-28 pb-16 px-8">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-landing-bg via-landing-bg to-[#E8EBE4]" />

        <div className="relative z-10 w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-8 shadow-sm">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="font-serif text-[32px] leading-tight text-landing-heading mb-2 tracking-[-0.01em]">
                Create an account
              </h1>
              <p className="text-landing-body text-[15px]">
                Join Kroix to access instant AI-powered radiology triage
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-landing-body text-[14px]">Full Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Dr. Jane Smith"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="bg-landing-bg/50 border-[rgba(0,0,0,0.06)] text-landing-heading placeholder:text-landing-muted h-11 rounded-[10px] hover:border-landing-primary focus:border-landing-primary focus-visible:ring-landing-primary/20 transition-colors"
                />
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="password" className="text-landing-body text-[14px]">Password</Label>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="specialty" className="text-landing-body text-[14px]">Specialty</Label>
                  <Input
                    id="specialty"
                    type="text"
                    placeholder="Radiology"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="bg-landing-bg/50 border-[rgba(0,0,0,0.06)] text-landing-heading placeholder:text-landing-muted h-11 rounded-[10px] hover:border-landing-primary focus:border-landing-primary focus-visible:ring-landing-primary/20 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institution" className="text-landing-body text-[14px]">Institution</Label>
                  <Input
                    id="institution"
                    type="text"
                    placeholder="Hospital Name"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="bg-landing-bg/50 border-[rgba(0,0,0,0.06)] text-landing-heading placeholder:text-landing-muted h-11 rounded-[10px] hover:border-landing-primary focus:border-landing-primary focus-visible:ring-landing-primary/20 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full px-7 py-3.5 bg-landing-primary text-white rounded-[10px] text-[15px] font-medium hover:bg-[#265A4C] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="text-[14px] text-landing-body text-center mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-landing-primary hover:text-[#265A4C] font-medium transition-colors">
                Sign in
              </Link>
            </p>
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
