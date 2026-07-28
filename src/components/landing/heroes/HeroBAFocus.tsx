import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductDemoExpanding } from "@/components/landing/ProductDemoExpanding";

const FIFO = [
  { id: "1B7E4F", pos: 1 },
  { id: "9A3C5D", pos: 2 },
  { id: "7F2A91", pos: 3 },
  { id: "E60F71", pos: 4 },
  { id: "C48D02", pos: 5, critical: true },
];

/** D5 — Demo is the hero, full width and centered. The "before" is reduced to a slim proof strip. */
export function HeroBAFocus() {
  return (
    <section className="relative px-6 pt-32 pb-24 bg-kx-canvas overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(1000px circle at 50% 15%, rgba(232,80,58,0.08), transparent 55%), radial-gradient(900px circle at 50% 80%, rgba(59,91,255,0.10), transparent 60%)",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto text-center mb-10">
        <h1 className="font-grotesk text-[44px] md:text-[62px] leading-[1.0] font-medium mb-6 tracking-[-0.03em] text-kx-ink">
          The read that matters,
          <br />
          <span className="text-kx-critical">already open.</span>
        </h1>
        <p className="text-[18px] text-kx-muted leading-relaxed max-w-xl mx-auto">
          Kroix scores every chest X-ray on arrival, lifts the critical one to the top,
          and has the Grad-CAM read waiting when you get there.
        </p>
      </div>

      {/* Slim "before" proof strip: the same 5 studies, in the order they'd sit without Kroix */}
      <div className="relative z-10 max-w-3xl mx-auto mb-4">
        <div className="flex items-center gap-2 justify-center flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-kx-muted mr-1">
            FIFO order
          </span>
          {FIFO.map((s) => (
            <span
              key={s.id}
              className={`font-mono text-[11px] px-2 py-1 rounded border ${
                s.critical
                  ? "border-kx-critical/50 text-kx-critical bg-kx-critical/[0.06]"
                  : "border-kx-border text-kx-muted bg-white/60"
              }`}
            >
              {s.pos}. {s.id}
              {s.critical && <span className="ml-1.5 opacity-70">urgent, last</span>}
            </span>
          ))}
        </div>
      </div>

      {/* The demo, front and center */}
      <div className="relative z-10 max-w-3xl mx-auto">
        <div className="absolute -inset-6 rounded-[30px] bg-gradient-to-b from-kx-accent2/10 to-emerald-500/[0.06] blur-2xl pointer-events-none" />
        <div className="relative">
          <ProductDemoExpanding />
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap gap-3 justify-center mt-11">
        <Link to="/contact">
          <button className="px-7 py-3.5 bg-kx-ink text-white rounded-[8px] text-[15px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
            Request demo
            <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
        <Link to="/dashboard">
          <button className="px-7 py-3.5 border border-kx-border bg-white text-kx-ink rounded-[8px] text-[15px] font-medium hover:border-kx-ink/40 transition-colors">
            See the product
          </button>
        </Link>
      </div>
    </section>
  );
}
