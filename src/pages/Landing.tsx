import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Activity, Brain, Zap, Shield, BarChart3, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Landing = () => {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    institution: "",
    message: "Hi, I'm interested in learning more about Kroix for my radiology practice.",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: formData,
      });

      if (error) throw error;

      toast.success("Message sent! We'll get back to you within 24 hours.");
      setFormData({
        name: "",
        email: "",
        institution: "",
        message: "Hi, I'm interested in learning more about Kroix for my radiology practice.",
      });
      setIsContactOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-critical/6 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
        </div>

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:80px_80px]" />

        {/* Navigation */}
        <nav className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-6 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
              <Activity className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold tracking-tight">Kroix</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/about">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                About
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Contact
              </Button>
            </Link>
            <Link to="/login">
              <Button className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20">
                Sign In
              </Button>
            </Link>
          </div>
        </nav>

        <div className="relative z-10 text-center max-w-5xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-8">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Radiology Workflow</span>
          </div>

          {/* Logo & Brand */}
          <div className="mb-6 flex items-center justify-center">
            <div className="relative">
              <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-primary via-primary/80 to-critical flex items-center justify-center shadow-2xl shadow-primary/40">
                <Activity className="w-14 h-14 text-primary-foreground" strokeWidth={2} />
              </div>
              <div className="absolute -inset-2 bg-gradient-to-br from-primary/50 to-critical/50 rounded-3xl blur-xl opacity-50 -z-10" />
            </div>
          </div>

          <h1 className="text-8xl md:text-[10rem] font-bold tracking-tighter mb-2 leading-none">
            <span className="bg-gradient-to-b from-foreground to-muted-foreground/70 bg-clip-text text-transparent">
              Kroix
            </span>
          </h1>

          <p className="text-2xl md:text-3xl text-muted-foreground mb-2 font-light tracking-wide">
            The AI Traffic Controller for Chest X-Rays
          </p>

          <p className="text-lg text-muted-foreground/60 mb-12 max-w-2xl mx-auto leading-relaxed">
            Intelligent triage prioritization that moves critical respiratory cases to the front.
            <br />
            <span className="text-muted-foreground/80">Faster reads. Better outcomes. Proven results.</span>
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dashboard">
              <Button 
                size="lg" 
                className="text-lg px-10 py-7 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl shadow-primary/30 transition-all hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-1 group"
              >
                Launch Dashboard
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-10 py-7 border-border/40 bg-background/50 backdrop-blur-sm hover:bg-surface hover:border-primary/40 transition-all"
              >
                <Brain className="w-5 h-5 mr-2" />
                See How It Works
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-20 flex flex-wrap items-center justify-center gap-6 md:gap-10 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface/50 border border-border/50">
              <Shield className="w-4 h-4 text-clear" />
              <span>HIPAA Ready</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface/50 border border-border/50">
              <Activity className="w-4 h-4 text-primary" />
              <span>Non-Diagnostic Aid</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface/50 border border-border/50">
              <Zap className="w-4 h-4 text-warning" />
              <span>Sub-5s Inference</span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
          <div className="w-7 h-12 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center pt-2">
            <div className="w-1.5 h-3 bg-muted-foreground/40 rounded-full" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 px-6 bg-gradient-to-b from-surface/30 to-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-primary font-medium mb-3 tracking-wide uppercase text-sm">Capabilities</p>
            <h2 className="text-5xl font-bold mb-6 tracking-tight">Intelligent Workflow Orchestration</h2>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
              Kroix transforms how radiologists work by prioritizing what matters most
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="group relative p-8 rounded-3xl bg-gradient-to-b from-surface to-background border border-border/50 hover:border-critical/30 transition-all hover:-translate-y-2 duration-300">
              <div className="absolute inset-0 bg-gradient-to-b from-critical/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-critical/10 flex items-center justify-center mb-6 group-hover:bg-critical/20 transition-colors">
                  <Activity className="w-8 h-8 text-critical" />
                </div>
                <h3 className="text-2xl font-semibold mb-4">Priority Triage</h3>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  AI-powered risk scoring moves critical COPD and pneumonia cases to the top. 
                  No more missed findings buried in FIFO queues.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative p-8 rounded-3xl bg-gradient-to-b from-surface to-background border border-border/50 hover:border-primary/30 transition-all hover:-translate-y-2 duration-300">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <Brain className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-4">Lab Fusion</h3>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  Combine imaging with real-time biomarkers. CO₂, pH, O₂ saturation—all 
                  in context when you need it.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative p-8 rounded-3xl bg-gradient-to-b from-surface to-background border border-border/50 hover:border-clear/30 transition-all hover:-translate-y-2 duration-300">
              <div className="absolute inset-0 bg-gradient-to-b from-clear/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-clear/10 flex items-center justify-center mb-6 group-hover:bg-clear/20 transition-colors">
                  <BarChart3 className="w-8 h-8 text-clear" />
                </div>
                <h3 className="text-2xl font-semibold mb-4">Measurable Impact</h3>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  Track Mean Time to Review, throughput gains, and override rates. 
                  Prove ROI with real operational metrics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center p-8 rounded-2xl bg-surface/30 border border-border/30">
              <div className="text-6xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent mb-3">40%</div>
              <div className="text-muted-foreground text-lg">Faster MTTR</div>
            </div>
            <div className="text-center p-8 rounded-2xl bg-surface/30 border border-border/30">
              <div className="text-6xl font-bold bg-gradient-to-br from-clear to-clear/60 bg-clip-text text-transparent mb-3">25%</div>
              <div className="text-muted-foreground text-lg">Higher Throughput</div>
            </div>
            <div className="text-center p-8 rounded-2xl bg-surface/30 border border-border/30">
              <div className="text-6xl font-bold bg-gradient-to-br from-warning to-warning/60 bg-clip-text text-transparent mb-3">&lt;5s</div>
              <div className="text-muted-foreground text-lg">Inference Time</div>
            </div>
            <div className="text-center p-8 rounded-2xl bg-surface/30 border border-border/30">
              <div className="text-6xl font-bold bg-gradient-to-br from-critical to-critical/60 bg-clip-text text-transparent mb-3">95%</div>
              <div className="text-muted-foreground text-lg">Critical Detection</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-16 rounded-3xl bg-gradient-to-br from-primary/10 via-surface to-critical/5 border border-primary/20 overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
            <div className="relative">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Transform Your Workflow?</h2>
              <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                Join leading radiology practices using Kroix to prioritize critical cases and improve patient outcomes.
              </p>
              <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="lg" 
                    className="text-lg px-12 py-7 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/30"
                  >
                    Get Started Now
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Get Started with Kroix</DialogTitle>
                    <DialogDescription>
                      Fill out the form below and we'll get back to you within 24 hours.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact-name">Name</Label>
                      <Input
                        id="contact-name"
                        placeholder="Dr. Jane Smith"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">Email</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="jane@hospital.org"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-institution">Institution (Optional)</Label>
                      <Input
                        id="contact-institution"
                        placeholder="General Hospital"
                        value={formData.institution}
                        onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-message">Message</Label>
                      <Textarea
                        id="contact-message"
                        placeholder="Tell us about your radiology workflow..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                        rows={3}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send Message"
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-border/30">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Kroix</span>
          </div>
          <div className="text-sm text-muted-foreground text-center">
            © 2026 Kroix. Non-diagnostic workflow prioritization tool.
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
