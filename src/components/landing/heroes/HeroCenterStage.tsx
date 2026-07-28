import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { LiveQueueHero } from "@/components/landing/LiveQueueHero";

const LOGOS = ["Regional Imaging", "Mercy Health", "Northside Rad", "Valley Diagnostics"];

/** Variant 2 — Centered headline with the product panel rising from the bottom edge. */
export function HeroCenterStage() {
  return (
    <section className="relative min-h-screen flex flex-col items-center pt-32 pb-0 overflow-hidden bg-kx-canvas">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(1000px circle at 50% -10%, rgba(59,91,255,0.12), transparent 60%), radial-gradient(700px circle at 80% 20%, rgba(232,80,58,0.07), transparent 55%)",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-8 text-center">
        <div className="inline-flex items-center gap-2 font-mono text-[11px] text-kx-muted uppercase tracking-[0.15em] mb-8 px-3 py-1.5 rounded-full border border-kx-border bg-white/70 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live in pilot deployment
        </div>
        <h1 className="font-grotesk text-[46px] md:text-[64px] leading-[1.02] font-medium mb-7 tracking-[-0.03em] text-kx-ink">
          The worklist that
          <br />
          <span className="text-kx-accent2">sorts itself.</span>
        </h1>
        <p className="text-[18px] text-kx-muted leading-relaxed mb-10 max-w-xl mx-auto">
          A 3-model ensemble scores every chest X-ray on arrival and lifts the critical
          cases to the top of the queue automatically.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mb-14">
          <Link to="/contact">
            <button className="px-7 py-3.5 bg-kx-ink text-white rounded-[8px] text-[15px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
              Request demo
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <Link to="/dashboard">
            <button className="px-7 py-3.5 border border-kx-border text-kx-ink rounded-[8px] text-[15px] font-medium hover:border-kx-ink/40 transition-colors bg-white">
              See how it works
            </button>
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 mb-16">
          {LOGOS.map((name) => (
            <span key={name} className="font-grotesk text-[14px] text-kx-muted/60 font-medium">
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* Product panel rising from the bottom edge, cropped */}
      <div className="relative z-10 w-full max-w-4xl px-8">
        <div className="rounded-t-2xl border border-b-0 border-kx-border bg-white shadow-[0_-20px_60px_-24px_rgba(18,21,26,0.25)] p-6 pb-0">
          <div className="max-h-[300px] overflow-hidden">
            <LiveQueueHero />
          </div>
        </div>
      </div>
    </section>
  );
}
