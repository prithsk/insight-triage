import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductDemoExpanding } from "@/components/landing/ProductDemoExpanding";

const FIFO = [
  { id: "1B7E4F", loc: "Rad-2 · routine" },
  { id: "9A3C5D", loc: "ER-1 · walk-in" },
  { id: "7F2A91", loc: "ER-3 · follow-up" },
  { id: "E60F71", loc: "ICU-4 · post-op" },
  { id: "C48D02", loc: "ICU-1 · resp. distress", critical: true },
];

/** D4 — The live demo physically overlaps and covers the dead list, like it's replacing it. */
export function HeroBAOverlap() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center px-6 py-28 bg-kx-surface overflow-hidden">
      <div className="relative z-10 max-w-2xl mx-auto text-center mb-14">
        <h1 className="font-grotesk text-[42px] md:text-[58px] leading-[1.0] font-medium mb-6 tracking-[-0.03em] text-kx-ink">
          Replace the queue
          <br />
          that <span className="text-kx-critical">buries the urgent one.</span>
        </h1>
        <p className="text-[18px] text-kx-muted leading-relaxed">
          Same PACS, same viewer. Kroix just decides what you see first, and has the
          read waiting.
        </p>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto w-full">
        <div className="relative">
          {/* BEFORE, underneath and offset */}
          <div className="lg:w-[58%] rounded-xl border border-kx-border bg-white/70 p-5 lg:translate-x-0">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-kx-muted">
                Before
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
                    s.critical
                      ? "border-kx-critical/40 bg-kx-critical/[0.05]"
                      : "border-kx-border bg-white"
                  }`}
                >
                  <span className="font-mono text-[11px] text-kx-muted w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[12px] text-kx-ink truncate">{s.id}</p>
                    <p className="text-[11px] text-kx-muted truncate">{s.loc}</p>
                  </div>
                  {s.critical && (
                    <span className="font-mono text-[9px] uppercase tracking-wider text-kx-critical whitespace-nowrap">
                      buried
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AFTER, overlapping on top and to the right */}
          <div className="lg:absolute lg:top-14 lg:right-0 lg:w-[62%] mt-6 lg:mt-0 z-10">
            <span className="absolute -top-3 left-4 z-10 font-mono text-[10px] uppercase tracking-[0.15em] bg-emerald-500 text-white px-2 py-1 rounded">
              After
            </span>
            <ProductDemoExpanding />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap gap-3 justify-center mt-12 lg:mt-24">
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
