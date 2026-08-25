import {
  ReaderReportingBench,
  ReaderOverlayInspector,
  ReaderFilmstrip,
  ReaderTabbedWorkspace,
  ReaderEvidenceColumn,
} from "@/components/dashboard/WorklistReaderVariants";

const VARIANTS = [
  {
    n: "R1",
    name: "Reporting Bench",
    note: "New Lantern's premise — the deliverable is a signed report, not a score. Queue, image and a live draft impression share one screen; Kroix's score becomes an input to the report rather than the product's output. The only variant where the radiologist finishes their actual job without leaving.",
    C: ReaderReportingBench,
  },
  {
    n: "R2",
    name: "Overlay Inspector",
    note: "Rivet's floating chrome. The image takes the whole surface; queue collapses to a 58px icon rail and the trace floats over as a dismissible card. Most pixels for the thing being diagnosed, but the queue is one hover away from invisible.",
    C: ReaderOverlayInspector,
  },
  {
    n: "R3",
    name: "Filmstrip",
    note: "Queue runs horizontally as thumbnails, so you scan images rather than read identifiers. Trades rows-per-screen for recognition — you see the next four studies as pictures.",
    C: ReaderFilmstrip,
  },
  {
    n: "R4",
    name: "Tabbed Workspace",
    note: "herdr's shape. Several studies open at once as tabs; the rail groups by state (unread / in progress / signed) rather than severity. Fits how cases actually get parked pending a prior or a clinical call.",
    C: ReaderTabbedWorkspace,
  },
  {
    n: "R5",
    name: "Evidence Column",
    note: "Forward's Strengths / Diligence Points stack applied to a study. A third column argues the case — what raised the score, what argues against it, what's missing — so a radiologist can disagree with a specific claim instead of the whole number.",
    C: ReaderEvidenceColumn,
  },
];

export default function ReaderVariants() {
  return (
    <div className="bg-kx-canvas">
      <div className="sticky top-0 z-50 bg-kx-ink text-white px-8 py-3 flex items-center justify-between">
        <span className="font-display font-semibold text-[15px]">Kroix · reader variants</span>
        <div className="flex items-center gap-4">
          {[
            ["/worklist-variants", "worklist"],
            ["/hero-variants", "hero"],
            ["/about-variants", "about"],
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
            R-series · five takes on W2
          </p>
          <p className="text-[14px] text-white/50 max-w-3xl leading-relaxed">
            W2 established the constraint worth keeping: the queue stays on screen, so opening a
            study is not a navigation. These five disagree about what belongs in the pane beside
            it — a report, the image alone, thumbnails, several open cases, or an argument.
          </p>
          <p className="text-[13px] text-white/35 max-w-3xl leading-relaxed mt-3">
            What to compare: what the radiologist is being asked to produce, whether they can
            disagree with the score in a specific way, and what happens to a case they can't
            finish right now.
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
