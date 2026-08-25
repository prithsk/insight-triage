import {
  TraceBento,
  TraceDarkStage,
  TraceInspector,
  TraceAnnotatedReceipt,
  TraceContributionGraph,
} from "@/components/landing/TraceSections";

const VARIANTS = [
  {
    n: "T1",
    name: "Provenance Bento",
    note: "Osseus-style tinted 2×2 bento. Each card leads with a bold sentence + grey continuation, an eyebrow tag, then a live mini-UI: vote bars, Grad-CAM, audit log, latency waterfall.",
    C: TraceBento,
  },
  {
    n: "T2",
    name: "Dark Stage",
    note: "Starcloud fold logic. Full dark band, big serif statement, the waterfall panel glowing on it, and three hairline-ruled columns underneath.",
    C: TraceDarkStage,
  },
  {
    n: "T3",
    name: "Inspector Window",
    note: "Rivet-style. A real browser-chrome mockup of the trace inspector on faint architectural grid lines, tabs you can actually click, copy on the right.",
    C: TraceInspector,
  },
  {
    n: "T4",
    name: "Annotated Receipt",
    note: "The whole record for one study as a single receipt, with floating callout pills pointing at the parts that matter.",
    C: TraceAnnotatedReceipt,
  },
  {
    n: "T5",
    name: "Contribution Graph",
    note: "Line-art network. Hover a model and its edge lights up into the fusion node, which swaps to that model's own score.",
    C: TraceContributionGraph,
  },
];

export default function TraceVariants() {
  return (
    <div className="bg-kx-canvas">
      <div className="sticky top-0 z-50 bg-kx-ink text-white px-8 py-3 flex items-center justify-between">
        <span className="font-display font-semibold text-[15px]">Kroix · trace variants</span>
        <div className="flex items-center gap-4">
          {[
            ["/hero-variants", "hero"],
            ["/about-variants", "about"],
            ["/info-variants", "info"],
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
            T-series · “Every score, traceable”
          </p>
          <p className="text-[14px] text-white/50 max-w-3xl leading-relaxed">
            Five treatments of the explainability section. All five argue from the same study —
            three model votes, published weights, a fused 0.91, and the sign-off log — so the only
            variable is presentation.
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
