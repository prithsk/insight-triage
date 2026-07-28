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
import { Reveal } from "@/components/ui/reveal";

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
      <section className="relative min-h-screen flex items-center justify-center pt-28 pb-16 px-8">
        <Reveal className="relative z-10 w-full max-w-md" direction="none">
          {/* Card */}
          <div className="bg-kx-surface rounded-2xl border border-kx-border p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="font-grotesk text-[28px] leading-tight mb-2 tracking-[-0.01em]">
                Create an account
              </h1>
              <p className="text-kx-muted text-[15px]">
                Join Kroix to access instant AI-powered radiology triage
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-kx-muted text-[14px]">Full Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Dr. Jane Smith"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="bg-kx-surface2 border-kx-border text-kx-ink placeholder:text-kx-muted h-11 rounded-[8px] hover:border-kx-critical/40 focus:border-kx-critical/40 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-kx-muted text-[14px]">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="radiologist@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-kx-surface2 border-kx-border text-kx-ink placeholder:text-kx-muted h-11 rounded-[8px] hover:border-kx-critical/40 focus:border-kx-critical/40 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-kx-muted text-[14px]">Password</Label>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="specialty" className="text-kx-muted text-[14px]">Specialty</Label>
                  <Input
                    id="specialty"
                    type="text"
                    placeholder="Radiology"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="bg-kx-surface2 border-kx-border text-kx-ink placeholder:text-kx-muted h-11 rounded-[8px] hover:border-kx-critical/40 focus:border-kx-critical/40 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institution" className="text-kx-muted text-[14px]">Institution</Label>
                  <Input
                    id="institution"
                    type="text"
                    placeholder="Hospital Name"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="bg-kx-surface2 border-kx-border text-kx-ink placeholder:text-kx-muted h-11 rounded-[8px] hover:border-kx-critical/40 focus:border-kx-critical/40 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full px-7 py-3.5 bg-kx-ink text-kx-canvas rounded-[8px] text-[15px] font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="text-[14px] text-kx-muted text-center mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-kx-critical hover:text-kx-critical/80 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          {/* Bottom note */}
          <p className="text-[13px] text-kx-muted text-center mt-6">
            Non-diagnostic workflow tool. For clinical decision support only.
          </p>
        </Reveal>
      </section>
    </div>
  );
}
