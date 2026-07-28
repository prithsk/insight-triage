import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductDemo } from "@/components/landing/ProductDemo";

const PROOF = ["3-model ensemble", "98.9% CV accuracy", "Sub-second scoring", "No PACS changes"];

/** Variant A — Notion-style: tight centered headline, then a wide demo dominating the fold. */
export function HeroStageWide() {
  return (
    <section className="relative pt-32 pb-20 px-6 bg-kx-canvas overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(1100px circle at 50% 0%, rgba(59,91,255,0.10), transparent 58%), radial-gradient(800px circle at 15% 30%, rgba(232,80,58,0.07), transparent 55%)",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto text-center mb-12">
        <div className="inline-flex items-center gap-2 font-mono text-[11px] text-kx-muted uppercase tracking-[0.15em] mb-7 px-3 py-1.5 rounded-full border border-kx-border bg-white/80 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Watch it reorder in real time
        </div>

        <h1 className="font-grotesk text-[44px] md:text-[62px] leading-[1.0] font-medium mb-6 tracking-[-0.03em] text-kx-ink">
          Stop reading scans
          <br />
          in the order they arrived.
        </h1>
        <p className="text-[18px] text-kx-muted leading-relaxed mb-9 max-w-xl mx-auto">
          Kroix scores every chest X-ray the second it lands and pushes the critical
          ones to the top of your worklist. You just read down the list.
        </p>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/contact">
            <button className="px-7 py-3.5 bg-kx-ink text-white rounded-[8px] text-[15px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
              Request demo
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <Link to="/dashboard">
            <button className="px-7 py-3.5 border border-kx-border bg-white text-kx-ink rounded-[8px] text-[15px] font-medium hover:border-kx-ink/40 transition-colors flex items-center gap-2">
              <Play className="w-4 h-4 fill-current" />
              See the product
            </button>
          </Link>
        </div>
      </div>

      {/* Wide demo, the visual anchor of the fold */}
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="absolute -inset-6 rounded-[28px] bg-gradient-to-b from-kx-accent2/10 to-transparent blur-2xl pointer-events-none" />
        <div className="relative">
          <ProductDemo />
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 mt-10">
        {PROOF.map((p) => (
          <span key={p} className="font-mono text-[12px] text-kx-muted uppercase tracking-wider">
            {p}
          </span>
        ))}
      </div>
    </section>
  );
}
