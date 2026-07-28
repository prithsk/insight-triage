import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import featureAccuracy from "@/assets/landing/feature-accuracy.jpg";

const META = [
  ["Modality", "Chest X-ray (CXR)"],
  ["Models", "DenseNet121 · GoogLeNet · ResNet18"],
  ["Latency", "Sub-second per study"],
  ["Status", "Pilot deployment"],
];

/** Variant 4 — Oversized editorial type. Headline spans full width; data sits in a mono spec table. */
export function HeroEditorial() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center px-8 py-32 bg-kx-canvas">
      <div className="max-w-7xl mx-auto w-full">
        {/* Oversized wordmark-scale headline */}
        <h1 className="font-grotesk font-medium tracking-[-0.045em] leading-[0.86] text-kx-ink text-[17vw] lg:text-[13vw] mb-10">
          TRIAGE,
          <br />
          <span className="text-kx-critical">REORDERED</span>
        </h1>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-20 items-start border-t border-kx-ink pt-8">
          {/* Left: spec table */}
          <div>
            <p className="text-[19px] text-kx-ink leading-relaxed max-w-xl mb-10">
              Every chest X-ray scored on arrival. Critical cases lifted to the top of the
              worklist automatically, before a radiologist has to go looking.
            </p>

            <dl className="divide-y divide-kx-border border-t border-kx-border">
              {META.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between py-3 gap-6">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.15em] text-kx-muted flex-shrink-0">{k}</dt>
                  <dd className="font-mono text-[13px] text-kx-ink text-right">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap gap-3 mt-10">
              <Link to="/contact">
                <button className="px-7 py-3.5 bg-kx-ink text-white rounded-none text-[14px] font-semibold hover:bg-kx-critical transition-colors flex items-center gap-2 uppercase tracking-wider">
                  Request demo
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link to="/dashboard">
                <button className="px-7 py-3.5 border border-kx-ink text-kx-ink rounded-none text-[14px] font-semibold hover:bg-kx-ink hover:text-white transition-colors uppercase tracking-wider">
                  See product
                </button>
              </Link>
            </div>
          </div>

          {/* Right: single inset image, deliberately small */}
          <div className="relative aspect-[4/5] w-full max-w-xs ml-auto">
            <img src={featureAccuracy} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover grayscale" />
            <span className="absolute -bottom-3 -left-3 bg-kx-critical text-white font-mono text-[10px] uppercase tracking-[0.2em] px-3 py-1.5">
              Fig. 01
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
