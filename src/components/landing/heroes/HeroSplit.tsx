import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import featureSpeed from "@/assets/landing/feature-speed.jpg";

/** Variant 1 — Hard 50/50 editorial split. Solid color block vs. full-bleed image, no scrim. */
export function HeroSplit() {
  return (
    <section className="relative min-h-screen grid lg:grid-cols-2">
      {/* Left: solid ink block */}
      <div className="bg-kx-ink flex items-center px-8 lg:px-16 py-24 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{ background: "radial-gradient(700px circle at 0% 100%, rgba(232,80,58,0.3), transparent 65%)" }}
        />
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-2 font-mono text-[11px] text-white/50 uppercase tracking-[0.2em] mb-8">
            <span className="w-6 h-px bg-kx-critical" />
            Radiology triage
          </div>
          <h1 className="font-grotesk text-[48px] lg:text-[68px] leading-[0.98] font-medium text-white mb-8 tracking-[-0.03em]">
            Critical scans
            <br />
            shouldn't
            <br />
            <span className="text-kx-critical">wait in line.</span>
          </h1>
          <p className="text-[17px] text-white/60 leading-relaxed mb-10">
            Kroix reads every chest X-ray on arrival and reorders the worklist by urgency,
            so the cases that matter get read first.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/contact">
              <button className="px-6 py-3 bg-white text-kx-ink rounded-[8px] text-[14px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
                Request demo
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link to="/dashboard">
              <button className="px-6 py-3 border border-white/25 text-white rounded-[8px] text-[14px] font-medium hover:bg-white/10 transition-colors">
                See the product
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Right: full-bleed image, untreated */}
      <div className="relative min-h-[50vh] lg:min-h-screen">
        <img src={featureSpeed} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg">
            <p className="font-mono text-[11px] text-kx-muted uppercase tracking-wider mb-0.5">Now reading</p>
            <p className="font-mono text-[13px] text-kx-ink">study_7f2a91c4 · CRITICAL 88%</p>
          </div>
        </div>
      </div>
    </section>
  );
}
