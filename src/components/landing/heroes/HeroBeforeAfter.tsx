import { ArrowRight, ArrowDown } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductDemo } from "@/components/landing/ProductDemo";

const FIFO = [
  { id: "1B7E4F", loc: "Rad-2 · routine" },
  { id: "9A3C5D", loc: "ER-1 · walk-in" },
  { id: "7F2A91", loc: "ER-3 · follow-up" },
  { id: "E60F71", loc: "ICU-4 · post-op" },
  { id: "C48D02", loc: "ICU-1 · resp. distress", critical: true },
];

/** Variant D — Side-by-side argument: the FIFO queue you have vs. the queue Kroix gives you. */
export function HeroBeforeAfter() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center px-6 py-28 bg-kx-surface overflow-hidden">
      <div className="relative z-10 max-w-2xl mx-auto text-center mb-14">
        <h1 className="font-grotesk text-[42px] md:text-[58px] leading-[1.0] font-medium mb-6 tracking-[-0.03em] text-kx-ink">
          Your sickest patient
          <br />
          is <span className="text-kx-critical">fifth in line.</span>
        </h1>
        <p className="text-[18px] text-kx-muted leading-relaxed">
          FIFO worklists don't know which scan is urgent. Kroix does, and it reorders
          the queue before anyone opens it.
        </p>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto w-full grid lg:grid-cols-[1fr_auto_1.15fr] gap-6 lg:gap-8 items-center">
        {/* BEFORE */}
        <div className="rounded-xl border border-kx-border bg-white/60 p-5 opacity-80">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-kx-muted">
              Without Kroix
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-kx-surface2 text-kx-muted">
              FIFO
            </span>
          </div>
          <div className="space-y-2">
            {FIFO.map((s, i) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
                  s.critical ? "border-kx-critical/40 bg-kx-critical/[0.04]" : "border-kx-border bg-white"
                }`}
              >
                <span className="font-mono text-[11px] text-kx-muted w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[12px] text-kx-ink truncate">{s.id}</p>
                  <p className="text-[11px] text-kx-muted truncate">{s.loc}</p>
                </div>
                {s.critical && (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-kx-critical whitespace-nowrap">
                    missed
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex lg:flex-col items-center justify-center gap-2 py-2">
          <div className="w-10 h-10 rounded-full bg-kx-ink flex items-center justify-center flex-shrink-0">
            <ArrowRight className="w-4 h-4 text-white hidden lg:block" />
            <ArrowDown className="w-4 h-4 text-white lg:hidden" />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-kx-muted lg:writing-mode-vertical">
            Kroix
          </span>
        </div>

        {/* AFTER — the live demo */}
        <div className="relative">
          <span className="absolute -top-3 left-4 z-10 font-mono text-[10px] uppercase tracking-[0.15em] bg-emerald-500 text-white px-2 py-1 rounded">
            With Kroix
          </span>
          <ProductDemo />
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap gap-3 justify-center mt-12">
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
