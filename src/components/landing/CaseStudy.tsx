import { Reveal } from "@/components/ui/reveal";

/**
 * A bold ink-colored statement block, distinct from the light bordered cards
 * elsewhere on the page.
 *
 * WAS A FABRICATED TESTIMONIAL. This block previously rendered a quotation mark,
 * a pull quote, and an attribution line reading "Pilot deployment, regional
 * imaging network" / "Early-stage worklist triage pilot". No pilot exists and no
 * imaging network has deployed Kroix. Presented as a case study, that is an
 * invented customer reference — the first thing diligence asks you to name.
 *
 * It is now a statement of what the system is designed to do, in Kroix's own
 * voice, with no attribution and no implied deployment. Do not reintroduce a
 * quote, a logo, or a customer line until a real one exists and has agreed in
 * writing to be named.
 *
 * The two figures are scoped deliberately: "<1s" is measured single-study
 * latency, and queue position describes ordering behaviour, not an outcome.
 */
export function CaseStudy() {
  return (
    <Reveal className="rounded-2xl bg-kx-ink p-8 md:p-12 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(600px circle at 100% 0%, rgba(59,91,255,0.25), transparent 70%)" }}
      />
      <div className="grid md:grid-cols-[1fr_auto] gap-8 items-center relative z-10">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-kx-accent2 mb-4 block">
            What it's built to do
          </span>
          <p className="font-display text-xl md:text-2xl leading-[1.4] text-white mb-6">
            Automated prioritization means the studies that matter reach the top of the list
            <span className="text-emerald-400"> before</span> a radiologist has to go looking for them.
          </p>
          <p className="text-[13px] text-white/50 leading-relaxed max-w-md">
            Whether that ordering actually brings studies inside a department's read-time
            targets is the open question. Measuring it is the current work.
          </p>
        </div>

        <div className="flex md:flex-col gap-6 md:gap-8 md:border-l md:border-white/15 md:pl-10">
          <div>
            <p className="font-mono text-4xl font-medium text-kx-accent2">&lt;1s</p>
            <p className="text-[13px] text-white/50 mt-1">To score each scan</p>
          </div>
          <div>
            <p className="font-mono text-4xl font-medium text-emerald-400">1st</p>
            <p className="text-[13px] text-white/50 mt-1">Where high scores are ordered</p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
