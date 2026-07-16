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
      description:
        "Every minute counts in respiratory emergencies. AI-powered prioritization ensures critical cases are seen first.",
    },
    {
      icon: Brain,
      title: "Intelligent analysis",
      description:
        "Deep learning models trained on millions of chest X-rays to surface subtle patterns invisible to the human eye.",
    },
    {
      icon: HeartPulse,
      title: "Life-saving impact",
      description:
        "Faster surfacing of pneumonia, COPD exacerbations, and other respiratory conditions means better patient outcomes.",
    },
    {
      icon: Shield,
      title: "Clinical safety",
      description:
        "Non-diagnostic AI assistance that augments radiologist expertise while keeping physicians in full control.",
    },
  ];

  return (
    <div className="min-h-screen bg-landing-bg text-landing-heading overflow-x-hidden">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <nav className="fixed top-0 left-0 right-0 z-40 px-8 py-6 bg-landing-bg/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <span className="text-2xl font-serif font-semibold text-landing-heading tracking-tight">Kroix</span>
          </Link>
          <div className="flex items-center gap-8">
            <Link to="/about" className="text-landing-heading text-[15px]">About</Link>
            <Link to="/contact" className="text-landing-body hover:text-landing-heading transition-colors text-[15px]">Contact</Link>
            <Link to="/login" className="text-landing-body hover:text-landing-heading transition-colors text-[15px]">Login</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-40 pb-20 px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-landing-bg via-landing-bg to-[#E8EBE4]" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#F5EDDB] text-[#8A6A1F] px-4 py-2 rounded-full mb-6 border border-[#E7D9B4]">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-[13px] font-medium">A healthcare crisis</span>
          </div>
          <h1 className="font-serif text-[44px] md:text-[56px] leading-[1.05] tracking-[-0.01em] mb-6">
            Radiology workflow is <em className="italic text-landing-primary">broken</em>.
          </h1>
          <p className="text-landing-body text-[17px] max-w-2xl mx-auto leading-relaxed">
            Every day, critical findings get buried in overflowing worklists. Radiologists are overwhelmed.
            Patients wait. We're building the calm layer that surfaces urgency first.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="relative py-14 px-8 border-y border-[rgba(0,0,0,0.06)] bg-[#E8EBE4]/40">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="font-serif text-[40px] text-landing-primary mb-2 tracking-[-0.01em]">{stat.value}</p>
              <p className="text-landing-body text-[14px]">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Challenge */}
      <section className="relative py-20 px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-10">
            <Stethoscope className="w-7 h-7 text-landing-primary" />
            <h2 className="font-serif text-[32px] tracking-[-0.01em]">The challenge</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-7 shadow-sm">
              <h3 className="font-serif text-[20px] mb-3 text-landing-heading">Radiologist burnout</h3>
              <p className="text-landing-body text-[15px] leading-relaxed">
                The average radiologist reads 50+ studies per day. Critical findings can be missed
                when buried among routine scans. Fatigue leads to errors.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-7 shadow-sm">
              <h3 className="font-serif text-[20px] mb-3 text-landing-heading">Delayed reads</h3>
              <p className="text-landing-body text-[15px] leading-relaxed">
                Without intelligent prioritization, urgent pneumonia cases wait in queue
                while routine studies are processed first. Time lost is lives lost.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="relative py-20 px-8 bg-[#E8EBE4]/40 border-y border-[rgba(0,0,0,0.06)]">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-10">
            <Brain className="w-7 h-7 text-landing-primary" />
            <h2 className="font-serif text-[32px] tracking-[-0.01em]">Our approach</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="group bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-7 shadow-sm hover:border-landing-primary/30 transition-colors"
              >
                <f.icon className="w-9 h-9 text-landing-primary mb-4 group-hover:scale-105 transition-transform" />
                <h3 className="font-serif text-[20px] mb-2 text-landing-heading">{f.title}</h3>
                <p className="text-landing-body text-[15px] leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="relative py-20 px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Users className="w-7 h-7 text-landing-primary" />
            <h2 className="font-serif text-[32px] tracking-[-0.01em]">Our vision</h2>
          </div>
          <p className="text-landing-body text-[17px] leading-relaxed mb-8">
            A future where no critical finding goes unnoticed. Where AI augments human expertise
            to deliver faster, more accurate reads. Where every patient receives timely care.
          </p>
          <div className="inline-flex items-center gap-2 text-landing-primary">
            <TrendingUp className="w-5 h-5" />
            <span className="text-[15px] font-medium">30% faster time to read in pilot studies</span>
          </div>
        </div>
      </section>

      <footer className="py-10 px-8 border-t border-[rgba(0,0,0,0.06)]">
        <p className="text-center text-[13px] text-landing-muted">
          Non-diagnostic workflow tool. For clinical decision support only.
        </p>
      </footer>
    </div>
  );
}
