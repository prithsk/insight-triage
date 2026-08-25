import {
  AnalyticsDeltaTable,
  AnalyticsStatBand,
  AnalyticsRunLog,
  AnalyticsSmallMultiples,
  AnalyticsConsole,
  AnalyticsSlaLedger,
  AnalyticsClaimsGaps,
} from "@/components/dashboard/AnalyticsVariants";

const VARIANTS = [
  {
    n: "A1",
    name: "Delta Table",
    note: "RunInfra's BASELINE / OPTIMIZED / DELTA table. Rows are metrics, columns are prior 7d / this 7d / change, with a sparkline at the end. No charts — the comparison is the presentation, and colour appears only on the delta.",
    C: AnalyticsDeltaTable,
  },
  {
    n: "A2",
    name: "Stat Band",
    note: "Forward's three-up editorial band. Enormous serif numbers, hairline-divided, qualifier in small caps beneath. Reads as a statement, not a dashboard — and that is the risk: this layout wants impressive numbers.",
    C: AnalyticsStatBand,
  },
  {
    n: "A3",
    name: "Run Log",
    note: "RunInfra's live run panel. Analytics as a chronological feed rather than an aggregate — every study is an event with its own timing. Shows the system working; poor for spotting a trend.",
    C: AnalyticsRunLog,
  },
  {
    n: "A4",
    name: "Small Multiples",
    note: "The bento page's hairline grid. Six panels, each one metric with a sparkline and current value. Built for scanning many series at once rather than reading one closely.",
    C: AnalyticsSmallMultiples,
  },
  {
    n: "A5",
    name: "Console",
    note: "herdr's counter row over a dark monospace readout. Everything is text; the only graphic is a bar made of block characters. Hardest of the seven to misread as marketing.",
    C: AnalyticsConsole,
  },
  {
    n: "A6",
    name: "SLA Ledger",
    note: "No reference has an equivalent — this one is specific to Kroix. Reads against read-time targets by band and counts breaches, with the 'if reordered' column deliberately empty until the replay has been run on real historical data.",
    C: AnalyticsSlaLedger,
  },
  {
    n: "A7",
    name: "Claims & Gaps",
    note: "Forward's Strengths / Diligence Points turned on Kroix itself. Every number stated as a claim with what backs it, beside an explicit list of what cannot be claimed. Makes the honesty constraint the design rather than a disclaimer under it.",
    C: AnalyticsClaimsGaps,
  },
];

export default function AnalyticsVariantsPage() {
  return (
    <div className="bg-kx-canvas">
      <div className="sticky top-0 z-50 bg-kx-ink text-white px-8 py-3 flex items-center justify-between">
        <span className="font-display font-semibold text-[15px]">Kroix · analytics variants</span>
        <div className="flex items-center gap-4">
          {[
            ["/worklist-variants", "worklist"],
            ["/reader-variants", "reader"],
            ["/hero-variants", "hero"],
            ["/trace-variants", "trace"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="font-mono text-[12px] text-white/50 hover:text-white transition-colors"
            >
              {label} →
            </a>
          ))}
        </div>
      </div>

      <div className="px-8 py-8 bg-kx-ink text-white">
        <div className="max-w-6xl mx-auto">
          <p className="font-display text-[22px] font-medium tracking-[-0.02em] mb-2">
            A-series · analytics
          </p>
          <p className="text-[14px] text-white/50 max-w-3xl leading-relaxed">
            The current page is four glassy stat cards over a tab strip of area charts — a layout
            that would sit unchanged on a CRM. These seven all render the same sample week, so the
            only variable is how the numbers are framed.
          </p>
          <p className="text-[13px] text-white/35 max-w-3xl leading-relaxed mt-3">
            What to compare: whether a reader could mistake activity for effect, what the layout
            does when there is no data yet, and whether it has anywhere to put the thing Kroix
            actually claims to move.
          </p>
        </div>
      </div>

      {VARIANTS.map(({ n, name, note, C }) => (
        <div key={n}>
          <div className="px-8 py-5 bg-kx-surface2 border-y border-kx-border">
            <div className="max-w-6xl mx-auto flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-mono text-[13px] text-kx-critical font-semibold">{n}</span>
              <span className="font-display text-[17px] font-medium text-kx-ink">{name}</span>
              <span className="text-[13px] text-kx-muted w-full">{note}</span>
            </div>
          </div>
          <C />
        </div>
      ))}
    </div>
  );
}
