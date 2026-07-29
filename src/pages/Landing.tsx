import { useState, useEffect } from "react";
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
import { Reveal } from "@/components/ui/reveal";
import { useScrollProgress } from "@/hooks/useScrollProgress";
import { useMagneticHover } from "@/hooks/useMagneticHover";
import { useCursorReticle } from "@/hooks/useCursorReticle";
import { TraceBento } from "@/components/landing/TraceSections";
import { CaseStudy } from "@/components/landing/CaseStudy";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { AppTourDemo } from "@/components/landing/AppTourDemo";
import { HeroVideoBackdrop } from "@/components/landing/HeroVideoBackdrop";
import { AboutLayerStack, AboutScatter } from "@/components/landing/AboutSections";
import { StayHookToast } from "@/components/landing/StayHookToast";
import { LiveQueueHero } from "@/components/landing/LiveQueueHero";
import { SpeedAccuracyDuo } from "@/components/landing/SpeedAccuracyDuo";
import { InfoChatNarrative } from "@/components/landing/InfoSections";

const Landing = () => {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    institution: "",
    message: "Hi, I'm interested in learning more about Kroix for my radiology practice.",
  });

  const scrollProgress = useScrollProgress(140);
  // The nav rides transparently over the hero footage and only goes solid once
  // the video is mostly scrolled past, so light-on-dark never fights the scrim.
  const [navSolid, setNavSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setNavSolid(window.scrollY > window.innerHeight * 0.75);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const heroCta = useMagneticHover<HTMLButtonElement>(0.15);
  const finalCta = useMagneticHover<HTMLButtonElement>(0.15);
  const reticle = useCursorReticle<HTMLDivElement>();

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
    <div className="min-h-screen bg-kx-canvas text-kx-ink font-sans">

      {/* Navigation — rides transparently over the hero footage, then goes solid */}
      <nav
        className={`fixed top-0 left-0 right-0 z-40 px-8 transition-[padding,background-color,border-color] duration-300 ${
          navSolid
            ? "bg-kx-canvas/85 backdrop-blur-md border-b border-kx-border"
            : "bg-transparent border-b border-transparent"
        }`}
        style={{
          paddingTop: `${20 - scrollProgress * 6}px`,
          paddingBottom: `${20 - scrollProgress * 6}px`,
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-kx-critical" />
            <span
              className={`font-display font-semibold tracking-tight origin-left transition-all duration-300 inline-block ${
                navSolid ? "text-kx-ink" : "text-white"
              }`}
              style={{ fontSize: "20px", transform: `scale(${1 - scrollProgress * 0.1})` }}
            >
              Kroix
            </span>
          </Link>
          <div className="flex items-center gap-8">
            <Link
              to="/about"
              className={`transition-colors text-[14px] ${
                navSolid ? "text-kx-muted hover:text-kx-ink" : "text-white/70 hover:text-white"
              }`}
            >
              About
            </Link>
            <Link
              to="/contact"
              className={`transition-colors text-[14px] ${
                navSolid ? "text-kx-muted hover:text-kx-ink" : "text-white/70 hover:text-white"
              }`}
            >
              Contact
            </Link>
            <Link to="/login">
              <button
                className={`px-4 py-2 rounded-full border transition-colors text-[14px] font-mono ${
                  navSolid
                    ? "border-kx-border text-kx-ink hover:border-kx-critical/50"
                    : "border-white/25 text-white hover:border-white/60 hover:bg-white/5"
                }`}
              >
                Sign in
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — footage behind a narrow centred column, CTAs inside the first fold */}
      <section
        ref={reticle.ref}
        className="relative min-h-[92vh] flex flex-col justify-center px-6 pt-32 pb-20 overflow-hidden"
      >
        <HeroVideoBackdrop src="/hero.mp4" scrim={0.7} fadeBottom={false} />

        {/* cursor reticle */}
        {reticle.enabled && reticle.pos && (
          <div
            className="absolute pointer-events-none z-20 w-8 h-8 -translate-x-1/2 -translate-y-1/2"
            style={{ left: reticle.pos.x, top: reticle.pos.y }}
          >
            <div className="w-full h-full rounded-full border border-white/50" />
            <div className="absolute top-1/2 left-1/2 w-2 h-px bg-white/70 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 w-px h-2 bg-white/70 -translate-x-1/2 -translate-y-1/2" />
          </div>
        )}

        <div className="relative z-10 max-w-3xl mx-auto text-center w-full">
          <Reveal delayMs={0} direction="none">
            <h1 className="font-editorial text-[50px] md:text-[80px] leading-[0.96] tracking-[-0.02em] text-white mb-6">
              Every scan scored.
              <br />
              <span className="italic text-white/55">The urgent one surfaced.</span>
            </h1>
            <p className="text-[17px] text-white/60 max-w-md mx-auto mb-10 leading-relaxed">
              AI triage for chest radiography — built so the radiologist reads in the
              order the patients actually need.
            </p>

            <div className="flex flex-wrap gap-3 justify-center">
              <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
                <DialogTrigger asChild>
                  <button
                    ref={heroCta.ref}
                    onMouseMove={heroCta.onMouseMove}
                    onMouseLeave={heroCta.onMouseLeave}
                    className="px-7 py-3.5 bg-white text-kx-ink rounded-full text-[15px] font-semibold hover:opacity-90 transition-opacity duration-150 flex items-center gap-2"
                    style={{ transition: "transform 0.15s ease-out, background-color 0.15s ease" }}
                  >
                    Request demo
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-kx-surface border-kx-border text-kx-ink">
                    <DialogHeader>
                      <DialogTitle className="font-grotesk text-2xl text-kx-ink">Request a demo</DialogTitle>
                      <DialogDescription className="text-kx-muted">
                        Fill out the form below and we'll get back to you within 24 hours.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="contact-name" className="text-kx-muted">Name</Label>
                        <Input
                          id="contact-name"
                          placeholder="Dr. Jane Smith"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          className="bg-kx-surface2 border-kx-border text-kx-ink"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-email" className="text-kx-muted">Email</Label>
                        <Input
                          id="contact-email"
                          type="email"
                          placeholder="jane@hospital.org"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          className="bg-kx-surface2 border-kx-border text-kx-ink"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-institution" className="text-kx-muted">Institution (Optional)</Label>
                        <Input
                          id="contact-institution"
                          placeholder="General Hospital"
                          value={formData.institution}
                          onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                          className="bg-kx-surface2 border-kx-border text-kx-ink"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-message" className="text-kx-muted">Message</Label>
                        <Textarea
                          id="contact-message"
                          placeholder="Tell us about your radiology workflow..."
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          required
                          rows={3}
                          className="bg-kx-surface2 border-kx-border text-kx-ink"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full px-7 py-3.5 bg-kx-ink text-kx-canvas rounded-[8px] text-[15px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending...
                          </span>
                        ) : (
                          "Send message"
                        )}
                      </button>
                    </form>
                  </DialogContent>
                </Dialog>
              <Link to="/dashboard">
                <button className="px-7 py-3.5 border border-white/25 text-white rounded-full text-[15px] font-medium hover:border-white/60 hover:bg-white/5 transition-colors">
                  See how it works
                </button>
              </Link>
            </div>

            <div className="mt-12 flex items-center justify-center gap-6 flex-wrap">
              {["DenseNet121", "GoogLeNet", "ResNet18"].map((m) => (
                <span key={m} className="font-mono text-[11px] text-white/35 tracking-wide">
                  {m}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* The live queue, now below the fold */}
      <section className="py-24 px-6 bg-kx-canvas border-t border-kx-border">
        <div className="max-w-6xl mx-auto">
          <SectionRule n="01" title="The queue, live" />
          <div className="grid lg:grid-cols-[1fr_auto] gap-12 items-center">
            <Reveal>
              <h2 className="font-display text-[36px] md:text-[50px] leading-[1.04] tracking-[-0.03em] text-kx-ink mb-6 max-w-xl">
                The worklist that sorts itself.
              </h2>
              <p className="text-[18.5px] text-kx-muted leading-relaxed max-w-xl">
                A 3-model ensemble reads every chest X-ray the moment it arrives and moves the
                critical cases to the front, before a radiologist has to go looking.
              </p>
            </Reveal>
            <Reveal className="relative w-full lg:w-[440px]" delayMs={150}>
              <LiveQueueHero />
            </Reveal>
          </div>
        </div>
      </section>

      {/* The product, walking itself through dashboard → reviewer → analytics */}
      <section className="py-24 px-6 bg-kx-surface border-t border-kx-border">
        <div className="max-w-4xl mx-auto">
          <SectionRule n="02" title="The whole workflow, start to sign-off" />
          <AppTourDemo />
        </div>
      </section>

      {/* The problem, then the architecture that answers it */}
      <AboutScatter />
      <AboutLayerStack />

      {/* Speed + accuracy, paired as one two-card section instead of two stacked blocks */}
      <SpeedAccuracyDuo />

      {/* Live Triage Trace Section */}
      <TraceBento />


      {/* Case study and the morning-read narrative share one frame, side by side, so
          the two proof points read as a single screen instead of two full scrolls. */}
      <section className="py-24 px-8 bg-kx-tint2 border-t border-kx-border">
        <div className="max-w-[1400px] mx-auto grid lg:grid-cols-2 gap-10 items-start">
          <div className="rounded-3xl bg-white border border-kx-border p-8 md:p-10">
            <CaseStudy />
          </div>
          <div className="rounded-3xl bg-white border border-kx-border overflow-hidden">
            <InfoChatNarrative bgClass="bg-white" compact />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-28 px-8 bg-kx-canvas border-t border-kx-border">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-16">
            <span className="text-kx-accent2 text-[12.5px] font-mono font-medium tracking-wide uppercase mb-4 block">
              FAQ
            </span>
            <h2 className="font-display text-[38px] lg:text-[50px] leading-[1.04] tracking-[-0.025em]">
              Common questions
            </h2>
          </Reveal>
          <LandingFaq />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-8 bg-kx-critical relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ background: "radial-gradient(600px circle at 50% 0%, rgba(255,255,255,0.25), transparent 70%)" }}
        />
        <Reveal className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="font-display text-[40px] lg:text-[54px] leading-[1.04] text-white mb-8 tracking-[-0.03em]">
            Try it in your department.
          </h2>
          <p className="text-[19px] text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
            See how automated triage prioritization fits into your existing reading workflow.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
              <DialogTrigger asChild>
                <button
                  ref={finalCta.ref}
                  onMouseMove={finalCta.onMouseMove}
                  onMouseLeave={finalCta.onMouseLeave}
                  className="px-8 py-4 bg-kx-ink text-white rounded-[8px] text-[16px] font-semibold hover:bg-black transition-colors flex items-center gap-2"
                  style={{ transition: "transform 0.15s ease-out, background-color 0.15s ease" }}
                >
                  Request demo
                  <ArrowRight className="w-4 h-4" />
                </button>
              </DialogTrigger>
            </Dialog>
            <Link to="/contact">
              <button className="px-8 py-4 border border-white/40 text-white rounded-[8px] text-[16px] font-medium hover:bg-white/10 transition-colors">
                Contact
              </button>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="py-16 px-8 bg-kx-canvas border-t border-kx-border text-kx-muted">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-12">
            <div>
              <span className="font-grotesk font-semibold text-kx-ink tracking-tight text-xl">
                Kroix
              </span>
              <p className="text-[14px] mt-2 max-w-xs">
                Automated triage and worklist prioritization for clinical radiology.
              </p>
            </div>

            <div className="flex gap-16">
              <div className="space-y-4">
                <p className="text-[13px] uppercase tracking-wide">Company</p>
                <div className="space-y-3">
                  <Link to="/about" className="block text-[15px] hover:text-kx-ink transition-colors">
                    About
                  </Link>
                  <Link to="/contact" className="block text-[15px] hover:text-kx-ink transition-colors">
                    Contact
                  </Link>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[13px] uppercase tracking-wide">Legal</p>
                <div className="space-y-3">
                  <span className="block text-[15px]">Privacy Policy</span>
                  <span className="block text-[15px]">HIPAA Compliance</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-kx-border mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[14px]">© 2025 Kroix. All rights reserved.</p>
            <p className="text-[13px]">Non-diagnostic workflow tool. For clinical decision support only.</p>
          </div>
        </div>
      </footer>

      <StayHookToast />
    </div>
  );
};

/** Hairline section rule used to number the sections below the hero. */
function SectionRule({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-baseline gap-4 mb-10">
      <span className="font-mono text-[12.5px] text-kx-critical">{n}</span>
      <span className="font-display text-[22px] md:text-[26px] font-medium text-kx-ink tracking-[-0.02em]">
        {title}
      </span>
      <span className="flex-1 h-px bg-kx-border" />
    </div>
  );
}

export default Landing;
