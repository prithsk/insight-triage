import {
  MetricStreakCard,
  MetricCaseStudyRow,
  MetricOrchestrationGrid,
  MetricTracedGraph,
  MetricCyclingHero,
  MetricLedger,
  MetricBento,
} from "@/components/landing/MetricSections";

const VARIANTS = [
  {
    n: "M1",
    name: "Streak dashboard",
    ref: "Personal usage-card",
    note: "A 'your week on Kroix' panel — hero stat, two small tiles, then a progress-bar breakdown by urgency bucket instead of a divided stat row.",
    C: MetricStreakCard,
  },
  {
    n: "M2",
    name: "Case study + agent row",
    ref: "Billow finance-agent case study",
    note: "Stat mockup with a quote up top, then triage stages framed as staffed 'agents' (K-01 / K-02 / K-03), ending in a dark CTA card.",
    C: MetricCaseStudyRow,
  },
  {
    n: "M3",
    name: "Orchestration grid",
    ref: "Numbered workflow-track diagram",
    note: "Industrial, monospace, figure-labelled — outcomes framed as nodes traced across ER / ICU / Radiology tracks.",
    C: MetricOrchestrationGrid,
  },
  {
    n: "M4",
    name: "Traced network",
    ref: "Hover-to-trace graph",
    note: "A pulsing hub with six outcome nodes; hovering a category (Speed / Accuracy / Safety) highlights only its edges.",
    C: MetricTracedGraph,
  },
  {
    n: "M5",
    name: "Cycling hero stat",
    ref: "Harvey word-cycle, on numbers",
    note: "One huge number that cycles through all four metrics on a timer — the simplest, most confident option.",
    C: MetricCyclingHero,
  },
  {
    n: "M6",
    name: "Ledger",
    ref: "Financial-statement table",
    note: "A hairline-divided before/after ledger, numbers right-aligned like a P&L, with a delta column.",
    C: MetricLedger,
  },
  {
    n: "M7",
    name: "Uneven bento",
    ref: "Mixed-size bento grid",
    note: "One oversized headline stat plus three smaller cards and a pull-quote, instead of four equal tiles.",
    C: MetricBento,
  },
];

export default function MetricVariants() {
  return (
    <div className="bg-kx-canvas">
      <div className="sticky top-0 z-50 bg-kx-ink text-white px-8 py-3 flex items-center justify-between">
        <span className="font-display font-semibold text-[15px]">Kroix · measurable-outcomes variants</span>
        <div className="flex items-center gap-4">
          <a href="/info-variants" className="font-mono text-[12px] text-white/50 hover:text-white transition-colors">
            ← info variants
          </a>
          <a href="/hero-variants" className="font-mono text-[12px] text-white/50 hover:text-white transition-colors">
            hero variants →
          </a>
        </div>
      </div>

      <div className="px-8 py-8 bg-kx-ink text-white">
        <div className="max-w-6xl mx-auto">
          <p className="font-display text-[22px] font-medium tracking-[-0.02em] mb-2">
            Seven replacements for the flat divided-stat row
          </p>
          <p className="text-[14px] text-white/50 max-w-3xl leading-relaxed">
            Same four numbers throughout (40% / 25% / 95% / &lt;1s) — the only thing that changes is
            how they're presented.
          </p>
        </div>
      </div>

      {VARIANTS.map(({ n, name, ref, note, C }) => (
        <div key={n}>
          <div className="px-8 py-5 bg-kx-surface2 border-y border-kx-border">
            <div className="max-w-6xl mx-auto flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-mono text-[13px] text-kx-critical font-semibold">{n}</span>
              <span className="font-display text-[17px] font-medium text-kx-ink">{name}</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-kx-muted">
                ref · {ref}
              </span>
              <span className="text-[13px] text-kx-muted w-full">{note}</span>
            </div>
          </div>
          <C />
        </div>
      ))}
    </div>
  );
}
