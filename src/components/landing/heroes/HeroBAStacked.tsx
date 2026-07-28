import { ArrowRight, ArrowDown } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductDemoExpanding } from "@/components/landing/ProductDemoExpanding";

const FIFO = [
  { id: "1B7E4F", loc: "Rad-2 · routine" },
  { id: "9A3C5D", loc: "ER-1 · walk-in" },
  { id: "7F2A91", loc: "ER-3 · follow-up" },
  { id: "C48D02", loc: "ICU-1 · resp. distress", critical: true },
];

/** D2 — Vertical narrative. Dead list on top, big arrow, live demo below at full width. */
export function HeroBAStacked() {
  return (
    <section className="relative px-6 pt-28 pb-24 bg-kx-canvas overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(900px circle at 50% 70%, rgba(59,91,255,0.09), transparent 60%)" }}
      />

      <div className="relative z-10 max-w-2xl mx-auto text-center mb-12">
        <h1 className="font-grotesk text-[42px] md:text-[58px] leading-[1.0] font-medium mb-6 tracking-[-0.03em] text-kx-ink">
          Your sickest patient
          <br />
          is <span className="text-kx-critical">last in the queue.</span>
        </h1>
        <p className="text-[18px] text-kx-muted leading-relaxed">
          Watch what Kroix does about it.
        </p>
      </div>

      {/* BEFORE, compressed and greyed */}
      <div className="relative z-10 max-w-xl mx-auto">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-kx-muted mb-3 text-center">
          Your worklist today
        </p>
        <div className="rounded-xl border border-kx-border bg-white/50 p-3 grayscale opacity-70">
          <div className="space-y-1.5">
            {FIFO.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center gap-3 px-3 py-2 rounded-md border border-kx-border bg-white"
              >
                <span className="font-mono text-[11px] text-kx-muted w-4">{i + 1}</span>
                <p className="font-mono text-[12px] text-kx-ink flex-1 truncate">{s.id}</p>
                <p className="text-[11px] text-kx-muted truncate">{s.loc}</p>
                {s.critical && (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-kx-critical">
                    urgent
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* transition arrow */}
      <div className="relative z-10 flex flex-col items-center gap-2 py-7">
        <div className="w-px h-8 bg-gradient-to-b from-transparent to-kx-ink/30" />
        <div className="w-11 h-11 rounded-full bg-kx-ink flex items-center justify-center">
          <ArrowDown className="w-4 h-4 text-white" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-kx-muted">
          Kroix reorders + opens the read
        </span>
      </div>

      {/* AFTER, full width and alive */}
      <div className="relative z-10 max-w-3xl mx-auto">
        <div className="absolute -inset-5 rounded-[28px] bg-emerald-500/[0.07] blur-2xl pointer-events-none" />
        <div className="relative">
          <ProductDemoExpanding />
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
