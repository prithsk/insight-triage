import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductDemo } from "@/components/landing/ProductDemo";

const TICKER = [
  ["Studies scored today", "1,284"],
  ["Median time to score", "0.7s"],
  ["Critical surfaced", "37"],
];

/** Variant C — Dark spotlight stage. Demo sits in a lit pool, tilted in perspective. */
export function HeroSpotlight() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center px-6 py-28 bg-kx-ink overflow-hidden">
      {/* spotlight pool */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(1000px circle at 50% 65%, rgba(59,91,255,0.28), transparent 55%), radial-gradient(700px circle at 50% 10%, rgba(232,80,58,0.16), transparent 60%)",
        }}
      />
      {/* floor grid */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/2 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "linear-gradient(to top, black, transparent)",
          WebkitMaskImage: "linear-gradient(to top, black, transparent)",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto text-center mb-14">
        <h1 className="font-grotesk text-[46px] md:text-[66px] leading-[0.98] font-medium mb-6 tracking-[-0.03em] text-white">
          Minutes matter.
          <br />
          <span className="text-kx-critical">Kroix finds them.</span>
        </h1>
        <p className="text-[18px] text-white/55 leading-relaxed mb-9 max-w-lg mx-auto">
          Every chest X-ray scored on arrival. The critical case stops waiting behind
          the routine ones.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
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
      </div>

      {/* Tilted demo in the spotlight */}
      <div className="relative z-10 max-w-4xl mx-auto w-full" style={{ perspective: "1600px" }}>
        <div style={{ transform: "rotateX(9deg)", transformOrigin: "center top" }}>
          <ProductDemo dark />
        </div>
      </div>

      {/* Live ticker */}
      <div className="relative z-10 max-w-3xl mx-auto w-full mt-12 grid grid-cols-3 divide-x divide-white/10">
        {TICKER.map(([label, val]) => (
          <div key={label} className="text-center px-4">
            <p className="font-mono text-2xl md:text-3xl text-white font-medium">{val}</p>
            <p className="text-[11px] text-white/40 uppercase tracking-wider mt-1">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
