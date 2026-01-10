import { Button } from "@/components/ui/button";
import { Activity, Brain, Zap, Shield, BarChart3, Users } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-critical/5 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/10 to-transparent rounded-full" />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* Logo */}
          <div className="mb-8 flex items-center justify-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-critical flex items-center justify-center shadow-2xl shadow-primary/30">
                <Activity className="w-12 h-12 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-primary to-critical rounded-2xl blur opacity-40 -z-10" />
            </div>
          </div>

          {/* Brand name */}
          <h1 className="text-7xl md:text-9xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              Kroix
            </span>
          </h1>

          {/* Tagline */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-4 font-light">
            The AI Traffic Controller for Chest X-Rays
          </p>

          {/* Subtitle */}
          <p className="text-lg text-muted-foreground/80 mb-12 max-w-2xl mx-auto leading-relaxed">
            Revolutionizing radiology workflows with intelligent triage. 
            Prioritize critical respiratory cases instantly. Save time. Save lives.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dashboard">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5"
              >
                <Zap className="w-5 h-5 mr-2" />
                Launch Dashboard
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 border-border/50 hover:bg-surface hover:border-primary/50 transition-all"
            >
              <Brain className="w-5 h-5 mr-2" />
              Learn More
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-clear" />
              <span>HIPAA Ready</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span>Non-Diagnostic</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-warning" />
              <span>&lt;5s Inference</span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-surface/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Intelligent Workflow Orchestration</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Kroix transforms how radiologists work by prioritizing what matters most
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-2xl bg-background border border-border/50 hover:border-primary/50 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 rounded-xl bg-critical/10 flex items-center justify-center mb-6 group-hover:bg-critical/20 transition-colors">
                <Activity className="w-7 h-7 text-critical" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Priority Triage</h3>
              <p className="text-muted-foreground leading-relaxed">
                AI-powered risk scoring moves critical COPD and pneumonia cases to the top. 
                No more missed findings buried in FIFO queues.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 rounded-2xl bg-background border border-border/50 hover:border-primary/50 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <Brain className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Lab Fusion</h3>
              <p className="text-muted-foreground leading-relaxed">
                Combine imaging with real-time biomarkers. CO₂, pH, O₂ saturation—all 
                in context when you need it.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 rounded-2xl bg-background border border-border/50 hover:border-primary/50 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 rounded-xl bg-clear/10 flex items-center justify-center mb-6 group-hover:bg-clear/20 transition-colors">
                <BarChart3 className="w-7 h-7 text-clear" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Measurable Impact</h3>
              <p className="text-muted-foreground leading-relaxed">
                Track Mean Time to Review, throughput gains, and override rates. 
                Prove ROI with real operational metrics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold text-primary mb-2">40%</div>
              <div className="text-muted-foreground">Faster MTTR</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-clear mb-2">25%</div>
              <div className="text-muted-foreground">Higher Throughput</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-warning mb-2">&lt;5s</div>
              <div className="text-muted-foreground">Inference Time</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-critical mb-2">95%</div>
              <div className="text-muted-foreground">Critical Detection</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Kroix</span>
          </div>
          <div className="text-sm text-muted-foreground">
            © 2026 Kroix. Non-diagnostic workflow prioritization tool.
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
