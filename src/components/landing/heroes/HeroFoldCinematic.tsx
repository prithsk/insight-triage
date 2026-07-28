import { HeroVideoBackdrop } from "@/components/landing/HeroVideoBackdrop";
import { AppTourDemo } from "@/components/landing/AppTourDemo";
import { ProductDemoExpanding } from "@/components/landing/ProductDemoExpanding";
import { HeroCtas } from "./HeroCtas";

/**
 * E1 — Cinematic. Footage-backed fold in the Legora mould: statement line and
 * both CTAs sit above the fold with nothing else competing. The live worklist
 * and the autoplaying product tour come after, on the light canvas.
 */
export function HeroFoldCinematic() {
  return (
    <section className="bg-kx-canvas">
      {/* ── first fold: nothing below the CTAs ── */}
      <div className="relative min-h-[86vh] flex flex-col justify-center px-6 py-24">
        <HeroVideoBackdrop src="/hero.mp4" scrim={0.66} />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55 mb-7">
            Chest X-ray triage
          </p>
          <h1 className="font-display text-[46px] md:text-[76px] leading-[0.98] font-medium tracking-[-0.035em] text-white mb-6">
            Urgency decides
            <br />
            the reading order.
          </h1>
          <p className="text-[17px] md:text-[19px] text-white/65 max-w-xl mx-auto mb-10 leading-relaxed">
            Kroix scores every chest X-ray the moment it lands and puts the patient
            who cannot wait at the top of the radiologist's list.
          </p>
          <HeroCtas align="center" onDark />
        </div>
      </div>

      {/* ── below the fold: the live list, then the full product tour ── */}
      <div className="px-6 pb-28 -mt-10 relative z-10">
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

export function SectionLabel({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <span className="font-mono text-[11px] text-kx-critical">{n}</span>
      <span className="font-display text-[15px] font-medium text-kx-ink tracking-[-0.01em]">{title}</span>
      <span className="flex-1 h-px bg-kx-border" />
    </div>
  );
}
