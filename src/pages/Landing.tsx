import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
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
    <div className="min-h-screen bg-landing-bg text-landing-heading overflow-x-hidden">
      {/* Subtle grain texture overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-serif font-semibold text-landing-heading tracking-tight">
              Kroix
            </span>
          </div>
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
            <Link to="/login">
              <button className="px-5 py-2.5 rounded-[10px] border border-landing-primary text-landing-primary hover:bg-landing-primary hover:text-white transition-colors text-[15px]">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-24 pb-32">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-landing-bg via-landing-bg to-[#E8EBE4]" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <div className="max-w-xl">
              <h1 className="font-serif text-[64px] lg:text-[72px] leading-[1.05] font-medium text-landing-heading mb-8 tracking-[-0.02em]">
                Next-generation AI for clinical radiology.
              </h1>
              <p className="text-xl text-landing-body leading-relaxed mb-10">
                Intelligent triage prioritization that moves critical respiratory cases to the front—delivering faster reads with measurable accuracy.
              </p>
              <div className="flex flex-wrap gap-4">
                <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
                  <DialogTrigger asChild>
                    <button className="px-7 py-3.5 bg-landing-primary text-white rounded-[10px] text-[15px] font-medium hover:bg-[#265A4C] transition-colors flex items-center gap-2">
                      Request demo
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-landing-bg border-[rgba(0,0,0,0.06)]">
                    <DialogHeader>
                      <DialogTitle className="font-serif text-2xl text-landing-heading">Request a Demo</DialogTitle>
                      <DialogDescription className="text-landing-body">
                        Fill out the form below and we'll get back to you within 24 hours.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="contact-name" className="text-landing-body">Name</Label>
                        <Input
                          id="contact-name"
                          placeholder="Dr. Jane Smith"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          className="bg-white border-[rgba(0,0,0,0.06)] text-landing-heading"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-email" className="text-landing-body">Email</Label>
                        <Input
                          id="contact-email"
                          type="email"
                          placeholder="jane@hospital.org"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          className="bg-white border-[rgba(0,0,0,0.06)] text-landing-heading"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-institution" className="text-landing-body">Institution (Optional)</Label>
                        <Input
                          id="contact-institution"
                          placeholder="General Hospital"
                          value={formData.institution}
                          onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                          className="bg-white border-[rgba(0,0,0,0.06)] text-landing-heading"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-message" className="text-landing-body">Message</Label>
                        <Textarea
                          id="contact-message"
                          placeholder="Tell us about your radiology workflow..."
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          required
                          rows={3}
                          className="bg-white border-[rgba(0,0,0,0.06)] text-landing-heading"
                        />
                      </div>
                      <button 
                        type="submit" 
                        className="w-full px-7 py-3.5 bg-landing-primary text-white rounded-[10px] text-[15px] font-medium hover:bg-[#265A4C] transition-colors disabled:opacity-50"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending...
                          </span>
                        ) : (
                          "Send Message"
                        )}
                      </button>
                    </form>
                  </DialogContent>
                </Dialog>
                <Link to="/dashboard">
                  <button className="px-7 py-3.5 border border-landing-primary text-landing-primary rounded-[10px] text-[15px] font-medium hover:bg-landing-primary hover:text-white transition-colors">
                    See how it works
                  </button>
                </Link>
              </div>
            </div>

            {/* Right: Abstract visual */}
            <div className="relative hidden lg:flex items-center justify-center">
              <div className="relative w-[480px] h-[480px]">
                {/* Organic flowing gradient */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-landing-secondary/20 via-landing-primary/10 to-landing-bg blur-3xl" />
                <div className="absolute inset-8 rounded-full bg-gradient-to-tr from-landing-primary/15 to-landing-secondary/5 blur-2xl" />
                {/* Central abstract form */}
                <div className="absolute inset-16 rounded-full border border-landing-primary/10 flex items-center justify-center">
                  <div className="w-3/4 h-3/4 rounded-full bg-gradient-to-br from-landing-primary/8 to-transparent" />
                </div>
                {/* Subtle scan silhouette lines */}
                <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 480 480">
                  <ellipse cx="240" cy="200" rx="100" ry="120" fill="none" stroke="#2F6F5E" strokeWidth="0.5" />
                  <ellipse cx="240" cy="220" rx="80" ry="100" fill="none" stroke="#2F6F5E" strokeWidth="0.5" />
                  <path d="M 180 320 Q 240 380 300 320" fill="none" stroke="#2F6F5E" strokeWidth="0.5" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          {/* Feature 1 */}
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
            <div className="max-w-lg">
              <span className="text-landing-accent text-[13px] font-medium tracking-wide uppercase mb-4 block">
                Analysis
              </span>
              <h2 className="font-serif text-[40px] lg:text-[48px] leading-[1.1] text-landing-heading mb-6 tracking-[-0.01em]">
                Comprehensive Analysis
              </h2>
              <p className="text-lg text-landing-body leading-relaxed mb-6">
                AI-powered detection that identifies critical findings across every chest X-ray study.
              </p>
              <ul className="space-y-3 text-landing-body">
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-landing-primary" />
                  Pneumonia and COPD pattern recognition
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-landing-primary" />
                  Consolidation and opacity mapping
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-landing-primary" />
                  Integrated biomarker correlation
                </li>
              </ul>
            </div>
            <div className="relative h-[400px] rounded-2xl overflow-hidden bg-gradient-to-br from-landing-bg to-[#E8EBE4]">
              <div className="absolute inset-0 flex items-center justify-center opacity-40">
                <div className="w-64 h-80 rounded-lg bg-gradient-to-b from-landing-primary/10 to-transparent blur-sm" />
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
            <div className="order-2 lg:order-1 relative h-[400px] rounded-2xl overflow-hidden bg-gradient-to-br from-[#E8EBE4] to-landing-bg">
              <div className="absolute inset-0 flex items-center justify-center opacity-40">
                <div className="w-64 h-80 rounded-lg bg-gradient-to-b from-landing-secondary/10 to-transparent blur-sm" />
              </div>
            </div>
            <div className="order-1 lg:order-2 max-w-lg">
              <span className="text-landing-accent text-[13px] font-medium tracking-wide uppercase mb-4 block">
                Speed
              </span>
              <h2 className="font-serif text-[40px] lg:text-[48px] leading-[1.1] text-landing-heading mb-6 tracking-[-0.01em]">
                Real-time Processing
              </h2>
              <p className="text-lg text-landing-body leading-relaxed mb-6">
                Sub-5 second inference times that fit seamlessly into existing workflows.
              </p>
              <ul className="space-y-3 text-landing-body">
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-landing-primary" />
                  Immediate priority scoring
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-landing-primary" />
                  Automatic worklist reordering
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-landing-primary" />
                  Zero workflow disruption
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-lg">
              <span className="text-landing-accent text-[13px] font-medium tracking-wide uppercase mb-4 block">
                Precision
              </span>
              <h2 className="font-serif text-[40px] lg:text-[48px] leading-[1.1] text-landing-heading mb-6 tracking-[-0.01em]">
                Clinical-grade Accuracy
              </h2>
              <p className="text-lg text-landing-body leading-relaxed mb-6">
                Validated performance metrics that meet the demands of clinical environments.
              </p>
              <ul className="space-y-3 text-landing-body">
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-landing-primary" />
                  95% critical case detection
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-landing-primary" />
                  Continuous model refinement
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-landing-primary" />
                  Transparent confidence scoring
                </li>
              </ul>
            </div>
            <div className="relative h-[400px] rounded-2xl overflow-hidden bg-gradient-to-br from-landing-bg to-[#E8EBE4]">
              <div className="absolute inset-0 flex items-center justify-center opacity-40">
                <div className="w-64 h-80 rounded-lg bg-gradient-to-b from-landing-primary/10 to-transparent blur-sm" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section - Mecha style */}
      <section className="py-24 px-8 bg-landing-bg">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-landing-accent text-[13px] font-medium tracking-wide uppercase mb-4 block">
              Workflow
            </span>
            <h2 className="font-serif text-[40px] lg:text-[48px] leading-[1.1] text-landing-heading tracking-[-0.01em]">
              Seamless Integration
            </h2>
          </div>
          
          {/* Workflow strip */}
          <div className="flex items-center justify-center gap-8 lg:gap-16">
            {/* Input */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-landing-muted">
                  <rect x="4" y="4" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="16" cy="16" r="6" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <span className="text-[14px] text-landing-body">DICOM Scan</span>
            </div>

            {/* Arrow */}
            <div className="hidden sm:block">
              <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="text-landing-muted">
                <path d="M0 12H44M44 12L38 6M44 12L38 18" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>

            {/* AI */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-2xl border border-landing-primary/20 bg-landing-primary/5 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-landing-primary">
                  <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="16" cy="16" r="4" fill="currentColor" />
                </svg>
              </div>
              <span className="text-[14px] text-landing-primary font-medium">Kroix AI</span>
            </div>

            {/* Arrow */}
            <div className="hidden sm:block">
              <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="text-landing-muted">
                <path d="M0 12H44M44 12L38 6M44 12L38 18" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>

            {/* Output */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-landing-muted">
                  <rect x="4" y="4" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 12H24M8 16H20M8 20H16" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <span className="text-[14px] text-landing-body">Priority Report</span>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-32 px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-landing-accent text-[13px] font-medium tracking-wide uppercase mb-4 block">
              Testimonials
            </span>
            <h2 className="font-serif text-[40px] lg:text-[48px] leading-[1.1] text-landing-heading tracking-[-0.01em]">
              Trusted by Leading Institutions
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {/* Quote 1 */}
            <div className="space-y-6">
              <p className="text-lg text-landing-heading leading-relaxed">
                "Kroix transformed our radiology workflow. Critical cases now surface immediately, and our MTTR has improved by 35%."
              </p>
              <div>
                <p className="text-landing-heading font-medium">Dr. Sarah Chen</p>
                <p className="text-landing-muted text-[14px]">Chief of Radiology, Metro Health</p>
              </div>
            </div>

            {/* Quote 2 */}
            <div className="space-y-6">
              <p className="text-lg text-landing-heading leading-relaxed">
                "The accuracy is remarkable. We've seen a significant reduction in delayed diagnoses for respiratory conditions."
              </p>
              <div>
                <p className="text-landing-heading font-medium">Dr. Michael Torres</p>
                <p className="text-landing-muted text-[14px]">Pulmonologist, University Medical Center</p>
              </div>
            </div>

            {/* Quote 3 */}
            <div className="space-y-6">
              <p className="text-lg text-landing-heading leading-relaxed">
                "Implementation was seamless. Our team adopted Kroix within days, and the ROI was measurable within weeks."
              </p>
              <div>
                <p className="text-landing-heading font-medium">Dr. Emily Park</p>
                <p className="text-landing-muted text-[14px]">Director of Medical Imaging, Regional Health</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-8 bg-landing-bg">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-[40px] lg:text-[56px] leading-[1.1] text-landing-heading mb-8 tracking-[-0.02em]">
            Ready to transform your workflow?
          </h2>
          <p className="text-xl text-landing-body mb-10 max-w-xl mx-auto">
            Join leading radiology practices using Kroix to prioritize critical cases and improve patient outcomes.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
              <DialogTrigger asChild>
                <button className="px-8 py-4 bg-landing-primary text-white rounded-[10px] text-[16px] font-medium hover:bg-[#265A4C] transition-colors flex items-center gap-2">
                  Request demo
                  <ArrowRight className="w-4 h-4" />
                </button>
              </DialogTrigger>
            </Dialog>
            <Link to="/contact">
              <button className="px-8 py-4 border border-landing-primary text-landing-primary rounded-[10px] text-[16px] font-medium hover:bg-landing-primary hover:text-white transition-colors">
                Contact sales
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-8 bg-landing-dark text-white/80">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-12">
            <div>
              <span className="text-2xl font-serif font-semibold text-white tracking-tight">
                Kroix
              </span>
              <p className="text-white/50 text-[14px] mt-2 max-w-xs">
                Next-generation AI for clinical radiology triage and prioritization.
              </p>
            </div>

            <div className="flex gap-16">
              <div className="space-y-4">
                <p className="text-white/50 text-[13px] uppercase tracking-wide">Company</p>
                <div className="space-y-3">
                  <Link to="/about" className="block text-[15px] hover:text-white transition-colors">
                    About
                  </Link>
                  <Link to="/contact" className="block text-[15px] hover:text-white transition-colors">
                    Contact
                  </Link>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-white/50 text-[13px] uppercase tracking-wide">Legal</p>
                <div className="space-y-3">
                  <span className="block text-[15px] text-white/60">Privacy Policy</span>
                  <span className="block text-[15px] text-white/60">HIPAA Compliance</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[14px] text-white/40">
              © 2025 Kroix. All rights reserved.
            </p>
            <p className="text-[13px] text-white/40">
              Non-diagnostic workflow tool. For clinical decision support only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
