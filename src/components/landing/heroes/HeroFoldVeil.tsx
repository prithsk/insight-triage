import { AppTourDemo } from "@/components/landing/AppTourDemo";
import { ProductDemoExpanding } from "@/components/landing/ProductDemoExpanding";
import { HeroVideoBackdrop } from "@/components/landing/HeroVideoBackdrop";
import { HeroCtas } from "./HeroCtas";
import { SectionLabel } from "./HeroFoldCinematic";

/**
 * E5 — Veil. Footage runs behind a narrow centred column that fades from dark
 * into the light canvas, so the fold is cinematic but the page still reads as a
 * light product site. CTAs sit at the seam where the veil lifts.
 */
export function HeroFoldVeil() {
  return (
    <section className="bg-kx-canvas">
      <div className="relative min-h-[84vh] flex flex-col justify-center px-6 pt-28 pb-20">
        <HeroVideoBackdrop src="/hero.mp4" scrim={0.7} />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h1 className="font-editorial text-[50px] md:text-[80px] leading-[0.96] tracking-[-0.02em] text-white mb-6">
            Every scan scored.
            <br />
            <span className="italic text-white/55">The urgent one surfaced.</span>
          </h1>
          <p className="text-[17px] text-white/60 max-w-md mx-auto mb-10 leading-relaxed">
            AI triage for chest radiography — built so the radiologist reads in the
            order the patients actually need.
          </p>
          <HeroCtas align="center" onDark />

          <div className="mt-12 flex items-center justify-center gap-6 flex-wrap">
            {["DenseNet121", "GoogLeNet", "ResNet18"].map((m) => (
              <span key={m} className="font-mono text-[11px] text-white/35 tracking-wide">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 pb-28 relative z-10">
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
