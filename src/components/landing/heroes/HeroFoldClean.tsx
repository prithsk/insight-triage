import { AppTourDemo } from "@/components/landing/AppTourDemo";
import { ProductDemoExpanding } from "@/components/landing/ProductDemoExpanding";
import { HeroVideoBackdrop } from "@/components/landing/HeroVideoBackdrop";
import { HeroCtas } from "./HeroCtas";
import { SectionLabel } from "./HeroFoldCinematic";

/**
 * E6 — Clean cut. Same footage-backed fold as E5, but with the bottom
 * gradient fade removed: the hero ends in a hard, flat line straight into the
 * next section, the way Legora/Harvey do it, instead of dissolving into the
 * canvas. Less "produced," more like a plain full-bleed banner.
 */
export function HeroFoldClean() {
  return (
    <section className="bg-kx-canvas">
      <div className="relative min-h-[80vh] flex flex-col justify-center px-6 py-24 overflow-hidden">
        <HeroVideoBackdrop src="/hero.mp4" scrim={0.62} fadeBottom={false} />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55 mb-7">
            Chest X-ray triage
          </p>
          <h1 className="font-display text-[44px] md:text-[72px] leading-[1.0] font-medium tracking-[-0.03em] text-white mb-6">
            Urgency decides
            <br />
            the reading order.
          </h1>
          <p className="text-[17px] text-white/65 max-w-lg mx-auto mb-10 leading-relaxed">
            Kroix scores every chest X-ray the moment it lands and puts the patient
            who cannot wait at the top of the radiologist's list.
          </p>
          <HeroCtas align="center" onDark />
        </div>
      </div>

      <div className="px-6 py-28 bg-kx-canvas border-t border-kx-border">
        <div className="max-w-3xl mx-auto">
          <SectionLabel n="01" title="The queue, live" />
          <ProductDemoExpanding />
        </div>
        <div className="max-w-4xl mx-auto mt-20">
          <SectionLabel n="02" title="The whole workflow, start to sign-off" />
          <AppTourDemo />
        </div>
      </div>
    </section>
  );
}
