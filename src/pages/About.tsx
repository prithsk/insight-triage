import { Link } from "react-router-dom";
import {
  Brain,
  Clock,
  HeartPulse,
  Shield,
  TrendingUp,
  Users,
  Stethoscope,
  AlertTriangle,
} from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

export default function About() {
  const stats = [
    { value: "2.4M", label: "Pneumonia deaths annually worldwide" },
    { value: "30%", label: "Misdiagnosis rate in busy ERs" },
    { value: "72hrs", label: "Average delay for critical findings" },
  ];

  const features = [
    {
      icon: Clock,
      title: "Time-Critical Triage",
      description: "Every minute counts in respiratory emergencies. AI-powered prioritization ensures critical cases are seen first.",
    },
    {
      icon: Brain,
      title: "Intelligent Analysis",
      description: "Deep learning models trained on millions of chest X-rays to detect subtle patterns invisible to the human eye.",
    },
    {
      icon: HeartPulse,
      title: "Life-Saving Impact",
      description: "Faster detection of pneumonia, COPD exacerbations, and other respiratory conditions means better patient outcomes.",
    },
    {
      icon: Shield,
      title: "Clinical Safety",
      description: "Non-diagnostic AI assistance that augments radiologist expertise while maintaining full physician control.",
    },
  ];

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
            <Link to="/about" className="text-landing-heading font-medium text-[15px]">
              About
            </Link>
            <Link to="/contact" className="text-landing-body hover:text-landing-heading transition-colors text-[15px]">
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
      <section className="relative pt-40 pb-24 px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-landing-bg via-landing-bg to-[#EDF1EF]" />

        <Reveal className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-[#B4432F]/10 text-[#B4432F] px-4 py-2 rounded-full mb-6">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">A Healthcare Crisis</span>
          </div>

          <h1 className="font-serif text-[40px] md:text-[56px] leading-[1.1] font-medium text-landing-heading mb-6 tracking-[-0.02em]">
            Radiology workflow is <em className="not-italic text-[#B4432F]">broken</em>.
          </h1>

          <p className="text-xl text-landing-body max-w-2xl mx-auto leading-relaxed">
            Every day, critical findings get buried in overflowing worklists. Radiologists are
            overwhelmed. Patients suffer delays. We're building the solution.
          </p>
        </Reveal>
      </section>

      {/* Stats Section */}
      <section className="py-14 px-8 border-y border-[rgba(0,0,0,0.06)] bg-white">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <Reveal key={stat.label} delayMs={index * 100} className="text-center">
              <p className="font-serif text-4xl font-medium text-landing-primary mb-2">{stat.value}</p>
              <p className="text-landing-muted text-sm">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-24 px-8 bg-landing-bg">
        <div className="max-w-4xl mx-auto">
          <Reveal className="flex items-center gap-3 mb-10">
            <Stethoscope className="w-7 h-7 text-landing-primary" />
            <span className="text-landing-accent text-[13px] font-medium tracking-wide uppercase">
              The Challenge
            </span>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6">
            <Reveal delayMs={0} className="p-6 rounded-2xl bg-white border border-[rgba(0,0,0,0.06)]">
              <h3 className="font-serif text-lg text-[#B4432F] mb-3">Radiologist Burnout</h3>
              <p className="text-landing-body leading-relaxed">
                The average radiologist reads 50+ studies per day. Critical findings can be
                missed when buried among routine scans. Fatigue leads to errors.
              </p>
            </Reveal>

            <Reveal delayMs={100} className="p-6 rounded-2xl bg-white border border-[rgba(0,0,0,0.06)]">
              <h3 className="font-serif text-lg text-[#B4432F] mb-3">Delayed Diagnoses</h3>
              <p className="text-landing-body leading-relaxed">
                Without intelligent prioritization, urgent pneumonia cases wait in queue while
                routine studies are processed first. Time lost is lives lost.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <Reveal className="flex items-center gap-3 mb-10">
            <Brain className="w-7 h-7 text-landing-primary" />
            <span className="text-landing-accent text-[13px] font-medium tracking-wide uppercase">
              Our Solution
            </span>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <Reveal
                key={feature.title}
                delayMs={index * 90}
                className="p-6 rounded-2xl bg-landing-bg/60 border border-[rgba(0,0,0,0.06)] group hover:border-landing-primary/40 transition-colors"
              >
                <feature.icon className="w-9 h-9 text-landing-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-serif text-lg text-landing-heading mb-2">{feature.title}</h3>
                <p className="text-landing-body text-sm leading-relaxed">{feature.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-24 px-8 bg-landing-bg">
        <Reveal className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Users className="w-7 h-7 text-landing-primary" />
            <span className="text-landing-accent text-[13px] font-medium tracking-wide uppercase">
              Our Vision
            </span>
          </div>

          <p className="text-lg text-landing-body leading-relaxed mb-8">
            We envision a future where no critical finding goes unnoticed. Where AI augments
            human expertise to deliver faster, more accurate diagnoses. Where every patient
            receives timely care.
          </p>

          <div className="inline-flex items-center gap-2 text-landing-primary font-medium">
            <TrendingUp className="w-5 h-5" />
            <span>30% faster time to diagnosis in pilot studies</span>
          </div>
        </Reveal>
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
                Automated triage and worklist prioritization for clinical radiology.
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
            <p className="text-[14px] text-white/40">© 2025 Kroix. All rights reserved.</p>
            <p className="text-[13px] text-white/40">
              Non-diagnostic workflow tool. For clinical decision support only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
