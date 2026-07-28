import { AppTourDemo } from "@/components/landing/AppTourDemo";
import { ProductDemoExpanding } from "@/components/landing/ProductDemoExpanding";
import { HeroCtas } from "./HeroCtas";
import { SectionLabel } from "./HeroFoldCinematic";

const QUEUE = ["1B7E4F", "9A3C5D", "7F2A91", "E60F71", "C48D02"];

/**
 * E4 — Statement. One enormous line, no imagery, CTAs immediately underneath —
 * the most confident version of the fold. A single hairline queue strip is the
 * only product hint above the scroll, and it does the argument on its own.
 */
export function HeroFoldStatement() {
  return (
    <section className="bg-kx-canvas">
      <div className="relative min-h-[80vh] flex flex-col justify-center px-6 py-24">
        <div className="relative z-10 max-w-5xl mx-auto w-full text-center">
          <h1 className="font-display text-[52px] md:text-[92px] leading-[0.92] font-medium tracking-[-0.045em] text-kx-ink mb-8">
            First in,
            <br />
            <span className="text-kx-muted/40">is not</span>
            <br />
            worst off.
          </h1>

          <p className="text-[17px] md:text-[19px] text-kx-muted max-w-lg mx-auto mb-9 leading-relaxed">
            Radiology worklists run first-in-first-out. Kroix reorders them by clinical
            urgency, so the read that can't wait isn't waiting behind four that can.
          </p>

          <div className="mb-10">
            <HeroCtas align="center" />
          </div>

          {/* the argument, as one hairline strip */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {QUEUE.map((id, i) => {
              const critical = i === QUEUE.length - 1;
              return (
                <span
                  key={id}
                  className={`font-mono text-[10px] px-2 py-1 rounded-full border ${
                    critical
                      ? "border-kx-critical/50 text-kx-critical bg-kx-critical/[0.06]"
                      : "border-kx-border text-kx-muted/70"
                  }`}
                >
                  {i + 1}. {id}
                  {critical && <span className="ml-1.5 opacity-70">critical · last</span>}
                </span>
              );
            })}
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
