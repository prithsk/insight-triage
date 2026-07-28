import { AppTourDemo } from "@/components/landing/AppTourDemo";
import { ProductDemoExpanding } from "@/components/landing/ProductDemoExpanding";
import { HeroCtas } from "./HeroCtas";
import { SectionLabel } from "./HeroFoldCinematic";

/**
 * E2 — Editorial. Harvey-style restraint: a serif statement line on near-white,
 * one clarifying sentence, both CTAs, and a thin proof rail. No product chrome
 * in the fold at all; the demo earns its place below.
 */
export function HeroFoldEditorial() {
  return (
    <section className="bg-kx-canvas">
      <div className="relative min-h-[84vh] flex flex-col justify-center px-6 py-24">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(1100px circle at 18% 20%, rgba(59,91,255,0.07), transparent 58%)," +
              "radial-gradient(900px circle at 84% 78%, rgba(232,80,58,0.06), transparent 60%)",
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto w-full">
          <div className="grid md:grid-cols-[1.15fr_0.85fr] gap-12 md:gap-16 items-end">
            <div>
              <h1 className="font-editorial text-[54px] md:text-[86px] leading-[0.94] tracking-[-0.02em] text-kx-ink mb-7">
                The sickest patient
                <br />
                shouldn't be
                <br />
                <span className="italic text-kx-critical">fifth in line.</span>
              </h1>
              <HeroCtas />
            </div>

            <div className="md:pb-3">
              <p className="text-[17px] leading-[1.65] text-kx-muted mb-8">
                Kroix is triage software for radiology. A three-model ensemble scores
                every chest X-ray on arrival, reorders the worklist by clinical urgency,
                and hands the radiologist an explained read — never a decision.
              </p>
              <dl className="grid grid-cols-3 gap-4 border-t border-kx-border pt-5">
                {[
                  ["3", "models, fused"],
                  ["<1s", "per study"],
                  ["100%", "reads signed by a radiologist"],
                ].map(([v, l]) => (
                  <div key={l}>
                    <dt className="font-mono text-[20px] text-kx-ink">{v}</dt>
                    <dd className="text-[11px] leading-tight text-kx-muted mt-1">{l}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-28 bg-kx-surface pt-20 border-t border-kx-border">
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
