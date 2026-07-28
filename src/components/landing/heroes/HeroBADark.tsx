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

/** D3 — Dark stage. The dead list sits dim on the left, the live demo is lit on the right. */
export function HeroBADark() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center px-6 py-28 bg-kx-ink overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(900px circle at 72% 55%, rgba(15,157,110,0.22), transparent 58%), radial-gradient(600px circle at 20% 40%, rgba(232,80,58,0.14), transparent 60%)",
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto text-center mb-12">
        <h1 className="font-grotesk text-[42px] md:text-[58px] leading-[1.0] font-medium mb-6 tracking-[-0.03em] text-white">
          Five scans in.
          <br />
          <span className="text-kx-critical">One of them can't wait.</span>
        </h1>
        <p className="text-[18px] text-white/55 leading-relaxed">
          Kroix finds it on arrival, moves it to the top, and has the read open before
          you get there.
        </p>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto w-full grid lg:grid-cols-[0.8fr_1.2fr] gap-8 lg:gap-12 items-start">
        {/* BEFORE, dimmed into the dark */}
        <div className="lg:mt-14 opacity-45">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/40 mb-3">
            FIFO queue
          </p>
          <div className="space-y-2">
            {FIFO.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/10 bg-white/[0.03]"
              >
                <span className="font-mono text-[11px] text-white/30 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[12px] text-white/70 truncate">{s.id}</p>
                  <p className="text-[11px] text-white/30 truncate">{s.loc}</p>
                </div>
                {s.critical && (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-kx-critical">
                    buried
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AFTER, lit */}
        <div className="relative">
          <div className="absolute -inset-6 rounded-[28px] bg-emerald-400/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <ProductDemoExpanding dark />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap gap-3 justify-center mt-12">
        <Link to="/contact">
          <button className="px-7 py-3.5 bg-white text-kx-ink rounded-[8px] text-[15px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
            Request demo
            <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
        <Link to="/dashboard">
          <button className="px-7 py-3.5 border border-white/25 text-white rounded-[8px] text-[15px] font-medium hover:bg-white/10 transition-colors">
            See the product
          </button>
        </Link>
      </div>
    </section>
  );
}
