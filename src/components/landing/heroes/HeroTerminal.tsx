import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const LINES = [
  { t: "→ receive  study_7f2a91c4.dcm", c: "text-white/60" },
  { t: "  densenet121  ▸ 0.88 CRITICAL", c: "text-kx-critical" },
  { t: "  googlenet    ▸ 0.85 CRITICAL", c: "text-kx-critical" },
  { t: "  resnet18     ▸ 0.79 CRITICAL", c: "text-kx-critical" },
  { t: "  fused        ▸ 0.86", c: "text-amber-400" },
  { t: "✓ queue reordered · position 14 → 1", c: "text-emerald-400" },
];

/** Variant 5 — Full dark terminal. The hero IS the log output; type animates line by line. */
export function HeroTerminal() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(LINES.length);
      return;
    }
    const id = setInterval(() => {
      setVisible((v) => (v >= LINES.length ? 0 : v + 1));
    }, 700);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center px-8 py-28 bg-kx-ink overflow-hidden">
      {/* scanline texture */}
      <div
        className="absolute inset-0 opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 3px)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(800px circle at 70% 40%, rgba(15,157,110,0.18), transparent 60%)" }}
      />

      <div className="relative z-10 max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="font-mono text-[11px] text-emerald-400 uppercase tracking-[0.2em] mb-8">
            kroix@triage:~$
          </div>
          <h1 className="font-grotesk text-[44px] lg:text-[60px] leading-[1.0] font-medium text-white mb-7 tracking-[-0.03em]">
            Every scan,
            <br />
            scored on arrival.
          </h1>
          <p className="text-[17px] text-white/55 leading-relaxed mb-10 max-w-md">
            Three models run in parallel, fuse into one urgency score, and the worklist
            reorders itself. No black box, no manual sorting.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/contact">
              <button className="px-6 py-3 bg-emerald-400 text-kx-ink rounded-[8px] text-[14px] font-semibold hover:bg-emerald-300 transition-colors flex items-center gap-2">
                Request demo
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link to="/dashboard">
              <button className="px-6 py-3 border border-white/20 text-white rounded-[8px] text-[14px] font-medium hover:bg-white/10 transition-colors font-mono">
                --see-product
              </button>
            </Link>
          </div>
        </div>

        {/* Live terminal panel */}
        <div className="rounded-xl bg-black/50 border border-white/10 backdrop-blur-sm overflow-hidden shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/[0.03]">
            <span className="w-2.5 h-2.5 rounded-full bg-kx-critical" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="font-mono text-[11px] text-white/35 ml-2">inference.log</span>
          </div>
          <div className="p-5 font-mono text-[13px] leading-[1.9] min-h-[260px]">
            {LINES.slice(0, visible).map((l, i) => (
              <div key={i} className={l.c}>
                {l.t}
              </div>
            ))}
            <span className="inline-block w-2 h-4 bg-emerald-400 align-middle animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  );
}
