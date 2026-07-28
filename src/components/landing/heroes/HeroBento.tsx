import { ArrowRight, Activity, Clock, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import featureAnalysis from "@/assets/landing/feature-analysis.jpg";

/** Variant 3 — Bento mosaic. Headline is one tile among several; no single dominant column. */
export function HeroBento() {
  return (
    <section className="relative min-h-screen flex items-center px-6 py-28 bg-kx-surface">
      <div className="max-w-6xl mx-auto w-full grid md:grid-cols-3 md:grid-rows-3 gap-4 md:h-[640px]">
        {/* Headline tile, spans 2x2 */}
        <div className="md:col-span-2 md:row-span-2 rounded-2xl bg-white border border-kx-border p-8 lg:p-12 flex flex-col justify-between">
          <div className="flex items-center gap-2 font-mono text-[11px] text-kx-muted uppercase tracking-[0.18em]">
            <span className="w-1.5 h-1.5 rounded-full bg-kx-critical" />
            Non-diagnostic triage engine
          </div>
          <div>
            <h1 className="font-grotesk text-[40px] lg:text-[56px] leading-[1.0] font-medium tracking-[-0.03em] text-kx-ink mb-6">
              Read the right
              <br />
              scan first.
            </h1>
            <p className="text-[16px] text-kx-muted leading-relaxed max-w-md mb-8">
              Kroix scores every chest X-ray the moment it lands and reorders the queue
              by clinical urgency.
            </p>
            <Link to="/contact">
              <button className="px-6 py-3 bg-kx-ink text-white rounded-[8px] text-[14px] font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2">
                Request demo
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>

        {/* Image tile */}
        <div className="rounded-2xl overflow-hidden border border-kx-border relative min-h-[180px]">
          <img src={featureAnalysis} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
        </div>

        {/* Accent stat tile */}
        <div className="rounded-2xl bg-kx-accent2 p-6 flex flex-col justify-center text-white">
          <p className="font-mono text-4xl font-medium mb-1">98.9%</p>
          <p className="text-[13px] text-white/75">5-fold CV accuracy</p>
        </div>

        {/* Three small metric tiles across the bottom */}
        <div className="rounded-2xl bg-white border border-kx-border p-6 flex flex-col justify-center">
          <Clock className="w-5 h-5 text-kx-critical mb-3" />
          <p className="font-mono text-2xl font-medium text-kx-ink">&lt;1s</p>
          <p className="text-[12px] text-kx-muted mt-0.5">Per-scan scoring</p>
        </div>
        <div className="rounded-2xl bg-kx-ink p-6 flex flex-col justify-center">
          <Activity className="w-5 h-5 text-emerald-400 mb-3" />
          <p className="font-mono text-2xl font-medium text-white">3</p>
          <p className="text-[12px] text-white/50 mt-0.5">Model ensemble</p>
        </div>
        <div className="rounded-2xl bg-white border border-kx-border p-6 flex flex-col justify-center">
          <ShieldCheck className="w-5 h-5 text-kx-accent3 mb-3" />
          <p className="font-mono text-2xl font-medium text-kx-ink">0</p>
          <p className="text-[12px] text-kx-muted mt-0.5">PACS changes needed</p>
        </div>
      </div>
    </section>
  );
}
