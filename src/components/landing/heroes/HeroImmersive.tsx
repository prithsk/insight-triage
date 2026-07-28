import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductDemo } from "@/components/landing/ProductDemo";
import featureSpeed from "@/assets/landing/feature-speed.jpg";

/** Variant E — Photographic backdrop with the demo floating over it. Copy overlays the image. */
export function HeroImmersive() {
  return (
    <section className="relative min-h-screen flex items-center px-6 py-28 overflow-hidden">
      {/* Photo backdrop */}
      <div className="absolute inset-0">
        <img src={featureSpeed} alt="" aria-hidden="true" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-kx-ink/85" />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(900px circle at 25% 40%, rgba(232,80,58,0.22), transparent 60%)" }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto w-full grid lg:grid-cols-[1fr_minmax(0,460px)] gap-12 lg:gap-16 items-center">
        {/* Copy over the photo */}
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-white/50 uppercase tracking-[0.18em] mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-kx-critical animate-pulse" />
            Triage running live
          </div>

          <h1 className="font-grotesk text-[46px] lg:text-[64px] leading-[0.98] font-medium text-white mb-6 tracking-[-0.03em]">
            Never read the
            <br />
            wrong scan first.
          </h1>
          <p className="text-[18px] text-white/60 leading-relaxed mb-9 max-w-md">
            Kroix scores every chest X-ray the moment it arrives and rebuilds your
            worklist around what's actually urgent.
          </p>

          <div className="flex flex-wrap gap-3 mb-10">
            <Link to="/contact">
              <button className="px-7 py-3.5 bg-kx-critical text-white rounded-[8px] text-[15px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
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

          <div className="flex items-center gap-6 pt-6 border-t border-white/10">
            {[["98.9%", "CV accuracy"], ["<1s", "Per scan"], ["3", "Models"]].map(([v, l]) => (
              <div key={l}>
                <p className="font-mono text-xl text-white font-medium">{v}</p>
                <p className="text-[11px] text-white/40 uppercase tracking-wider">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Floating demo */}
        <div className="relative">
          <div className="absolute -inset-4 rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/10" />
          <div className="relative">
            <ProductDemo dark />
          </div>
        </div>
      </div>
    </section>
  );
}
