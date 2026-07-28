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
      title: "Time-critical triage",
      description: "Every minute counts in respiratory emergencies. AI-powered prioritization ensures critical cases are seen first.",
    },
    {
      icon: Brain,
      title: "Intelligent analysis",
      description: "Deep learning models trained on millions of chest X-rays to detect subtle patterns invisible to the human eye.",
    },
    {
      icon: HeartPulse,
      title: "Life-saving impact",
      description: "Faster detection of pneumonia, COPD exacerbations, and other respiratory conditions means better patient outcomes.",
    },
    {
      icon: Shield,
      title: "Clinical safety",
      description: "Non-diagnostic AI assistance that augments radiologist expertise while maintaining full physician control.",
    },
  ];

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
            <Link to="/about" className="text-kx-ink text-[14px] font-medium">About</Link>
            <Link to="/contact" className="text-kx-muted hover:text-kx-ink transition-colors text-[14px]">Contact</Link>
            <Link to="/login">
              <button className="px-4 py-2 rounded-[8px] border border-kx-border text-kx-ink hover:border-kx-critical/50 transition-colors text-[14px] font-mono">
                Sign in
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-40 pb-24 px-8 border-b border-kx-border">
        <Reveal className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 font-mono text-[12px] text-kx-critical uppercase tracking-wider mb-6 px-3 py-1.5 rounded-full border border-kx-critical/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            A healthcare crisis
          </div>

          <h1 className="font-grotesk text-[40px] md:text-[52px] leading-[1.1] font-medium mb-6 tracking-[-0.02em]">
            Radiology workflow is <span className="text-kx-critical">broken</span>.
          </h1>

          <p className="text-[18px] text-kx-muted max-w-2xl mx-auto leading-relaxed">
            Every day, critical findings get buried in overflowing worklists. Radiologists are
            overwhelmed. Patients suffer delays. We're building the solution.
          </p>
        </Reveal>
      </section>

      {/* Stats Section */}
      <section className="py-14 px-8 border-b border-kx-border bg-kx-surface/30">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <Reveal key={stat.label} delayMs={index * 100} className="text-center">
              <p className="font-mono text-4xl font-medium text-kx-critical mb-2">{stat.value}</p>
              <p className="text-kx-muted text-sm">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-24 px-8 border-b border-kx-border">
        <div className="max-w-4xl mx-auto">
          <Reveal className="flex items-center gap-3 mb-10">
            <Stethoscope className="w-6 h-6 text-kx-critical" />
            <span className="font-mono text-[12px] text-kx-critical uppercase tracking-wider">
              The challenge
            </span>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6">
            <Reveal delayMs={0} className="p-6 rounded-2xl bg-kx-surface border border-kx-border">
              <h3 className="font-grotesk text-lg text-kx-ink mb-3">Radiologist burnout</h3>
              <p className="text-kx-muted leading-relaxed">
                The average radiologist reads 50+ studies per day. Critical findings can be
                missed when buried among routine scans. Fatigue leads to errors.
              </p>
            </Reveal>

            <Reveal delayMs={100} className="p-6 rounded-2xl bg-kx-surface border border-kx-border">
              <h3 className="font-grotesk text-lg text-kx-ink mb-3">Delayed diagnoses</h3>
              <p className="text-kx-muted leading-relaxed">
                Without intelligent prioritization, urgent pneumonia cases wait in queue while
                routine studies are processed first. Time lost is lives lost.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 px-8 border-b border-kx-border bg-kx-surface/20">
        <div className="max-w-4xl mx-auto">
          <Reveal className="flex items-center gap-3 mb-10">
            <Brain className="w-6 h-6 text-kx-critical" />
            <span className="font-mono text-[12px] text-kx-critical uppercase tracking-wider">
              Our solution
            </span>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <Reveal
                key={feature.title}
                delayMs={index * 90}
                className="p-6 rounded-2xl bg-kx-surface border border-kx-border group hover:border-kx-critical/40 transition-colors"
              >
                <feature.icon className="w-8 h-8 text-kx-critical mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-grotesk text-lg text-kx-ink mb-2">{feature.title}</h3>
                <p className="text-kx-muted text-sm leading-relaxed">{feature.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-24 px-8 border-b border-kx-border">
        <Reveal className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Users className="w-6 h-6 text-kx-critical" />
            <span className="font-mono text-[12px] text-kx-critical uppercase tracking-wider">
              Our vision
            </span>
          </div>

          <p className="text-[17px] text-kx-muted leading-relaxed mb-8">
            We envision a future where no critical finding goes unnoticed. Where AI augments
            human expertise to deliver faster, more accurate diagnoses. Where every patient
            receives timely care.
          </p>

          <div className="inline-flex items-center gap-2 text-kx-critical font-mono text-[14px]">
            <TrendingUp className="w-4 h-4" />
            <span>30% faster time to diagnosis in pilot studies</span>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="py-16 px-8 bg-kx-canvas text-kx-muted">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-12">
            <div>
              <span className="font-grotesk font-semibold text-kx-ink tracking-tight text-xl">Kroix</span>
              <p className="text-[14px] mt-2 max-w-xs">
                Automated triage and worklist prioritization for clinical radiology.
              </p>
            </div>

            <div className="flex gap-16">
              <div className="space-y-4">
                <p className="text-[13px] uppercase tracking-wide">Company</p>
                <div className="space-y-3">
                  <Link to="/about" className="block text-[15px] hover:text-kx-ink transition-colors">About</Link>
                  <Link to="/contact" className="block text-[15px] hover:text-kx-ink transition-colors">Contact</Link>
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
    </div>
  );
}
