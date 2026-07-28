import { AppTourDemo } from "@/components/landing/AppTourDemo";
import { ProductDemoExpanding } from "@/components/landing/ProductDemoExpanding";
import { HeroVideoBackdrop } from "@/components/landing/HeroVideoBackdrop";
import { HeroCtas } from "./HeroCtas";

/**
 * E3 — Dark film. The whole hero *and* the demos stay on the dark stage, so the
 * page opens like a product film rather than a marketing page. Left-aligned
 * statement line keeps the fold tight; both CTAs land well above 100vh.
 */
export function HeroFoldDarkFilm() {
  return (
    <section className="bg-[#0B0E11]">
      <div className="relative min-h-[82vh] flex flex-col justify-center px-6 py-24">
        <HeroVideoBackdrop src="/hero.mp4" scrim={0.58} className="[&>div:last-child]:hidden" />

        <div className="relative z-10 max-w-5xl mx-auto w-full">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/[0.04] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-kx-critical animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">
              Non-diagnostic · radiologist-signed
            </span>
          </span>

          <h1 className="font-display text-[48px] md:text-[80px] leading-[0.96] font-medium tracking-[-0.035em] text-white max-w-3xl mb-7">
            Triage software
            <br />
            for radiology.
          </h1>
          <p className="text-[18px] text-white/60 max-w-lg leading-relaxed mb-10">
            Every chest X-ray scored on arrival. The critical one at the top of the
            list before anyone has to go looking for it.
          </p>
          <HeroCtas onDark />
        </div>
      </div>

      <div className="px-6 pb-28">
        <div className="max-w-3xl mx-auto">
          <DarkLabel n="01" title="The queue, live" />
          <ProductDemoExpanding dark />
        </div>
        <div className="max-w-4xl mx-auto mt-20">
          <DarkLabel n="02" title="The whole workflow, start to sign-off" />
          <AppTourDemo dark />
        </div>
      </div>
    </section>
  );
}

function DarkLabel({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <span className="font-mono text-[11px] text-kx-critical">{n}</span>
      <span className="font-display text-[15px] font-medium text-white tracking-[-0.01em]">{title}</span>
      <span className="flex-1 h-px bg-white/10" />
    </div>
  );
}
