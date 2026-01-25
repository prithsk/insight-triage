import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Activity, Loader2 } from "lucide-react";
import { 
  validateEmail, 
  sanitizeString,
  detectSQLInjection, 
  detectXSS, 
  checkRateLimit,
  logSecurityEvent 
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
    const rateLimit = checkRateLimit('signup', 3, 300000);
    if (!rateLimit.allowed) {
      toast({
        variant: "destructive",
        title: "Too many attempts",
        description: `Please wait ${Math.ceil(rateLimit.resetInMs / 1000)} seconds before trying again.`,
      });
      logSecurityEvent('rate_limit', { action: 'signup' });
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
        logSecurityEvent('sql_injection', { action: 'signup' });
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ 
            specialty: sanitizedSpecialty, 
            institution: sanitizedInstitution 
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-primary">
              <Activity className="h-8 w-8" />
              <span className="text-2xl font-bold">TriageAI</span>
            </div>
          </div>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>
            Join TriageAI to access AI-powered radiology triage
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Full Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Dr. Jane Smith"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="radiologist@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="specialty">Specialty</Label>
                <Input
                  id="specialty"
                  type="text"
                  placeholder="Radiology"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="institution">Institution</Label>
                <Input
                  id="institution"
                  type="text"
                  placeholder="Hospital Name"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
