import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductDemo } from "@/components/landing/ProductDemo";

const POINTS = [
  "Critical cases surface without anyone searching",
  "Runs inside your existing PACS and viewer",
  "Every score is traceable to the model that made it",
];

/** Variant B — Copy left, oversized demo bleeding off the right edge of the viewport. */
export function HeroBleedRight() {
  return (
    <section className="relative min-h-screen flex items-center bg-kx-canvas overflow-hidden pt-28 pb-20">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(900px circle at 75% 45%, rgba(59,91,255,0.12), transparent 60%)" }}
      />

      <div className="relative z-10 w-full max-w-[1500px] mx-auto grid lg:grid-cols-[minmax(0,520px)_1fr] gap-12 lg:gap-16 items-center px-8">
        {/* Copy */}
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-kx-critical uppercase tracking-[0.18em] mb-6">
            <span className="w-6 h-px bg-kx-critical" />
            Live triage
          </div>

          <h1 className="font-grotesk text-[44px] lg:text-[58px] leading-[1.0] font-medium mb-6 tracking-[-0.03em] text-kx-ink">
            The urgent scan is
            <br />
            <span className="text-kx-accent2">already at the top.</span>
          </h1>
          <p className="text-[17px] text-kx-muted leading-relaxed mb-8">
            Three models read every chest X-ray on arrival, fuse into one urgency score,
            and reorder the worklist before you open it.
          </p>

          <ul className="space-y-3 mb-10">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-emerald-600" />
                </span>
                <span className="text-[15px] text-kx-ink">{p}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3">
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
        </div>

        {/* Demo, scaled up and bleeding past the right edge */}
        <div className="relative lg:-mr-32 xl:-mr-48">
          <div className="lg:scale-[1.12] lg:origin-left">
            <ProductDemo />
          </div>
        </div>
      </div>
    </section>
  );
}
