import {
  InfoAnnotatedGrid,
  InfoSpotlightSwitcher,
  InfoEditorialPillars,
  InfoChatNarrative,
  InfoTrustMarks,
} from "@/components/landing/InfoSections";

const VARIANTS = [
  {
    n: "I1",
    name: "Annotated feature grid",
    ref: "Legora assistant grid",
    note: "Grey tiles with a floating pill callout overlapping the card edge instead of an icon + two lines. Framed around trust/security since that's what's actually true.",
    C: InfoAnnotatedGrid,
  },
  {
    n: "I2",
    name: "Spotlight switcher",
    ref: "Rivet directions mockup",
    note: "Color-flipped dark section: a clickable list of deployment contexts on the left, a live browser mockup that swaps its content on the right.",
    C: InfoSpotlightSwitcher,
  },
  {
    n: "I3",
    name: "Editorial pillars",
    ref: "Dark serif statement",
    note: "Three 'what Kroix will not do' pillars as large italic serif lines on ink, no cards at all.",
    C: InfoEditorialPillars,
  },
  {
    n: "I4",
    name: "Chat narrative",
    ref: "heyclicky voice bubbles",
    note: "The morning read framed as a short conversation between a radiologist and the queue, with a floating '<1s per reply' annotation.",
    C: InfoChatNarrative,
  },
  {
    n: "I5",
    name: "Abstract trust marks",
    ref: "Legora fingerprint art",
    note: "Compliance framed as abstract line-art icons (encryption rings, audit log bars, a checked shield) rather than a checklist.",
    C: InfoTrustMarks,
  },
];

export default function InfoVariants() {
  return (
    <div className="bg-kx-canvas">
      <div className="sticky top-0 z-50 bg-kx-ink text-white px-8 py-3 flex items-center justify-between">
        <span className="font-display font-semibold text-[15px]">Kroix · info-section variants</span>
        <div className="flex items-center gap-4">
          <a href="/about-variants" className="font-mono text-[12px] text-white/50 hover:text-white transition-colors">
            ← about variants
          </a>
          <a href="/metric-variants" className="font-mono text-[12px] text-white/50 hover:text-white transition-colors">
            metric variants →
          </a>
        </div>
      </div>

      <div className="px-8 py-8 bg-kx-ink text-white">
        <div className="max-w-6xl mx-auto">
          <p className="font-display text-[22px] font-medium tracking-[-0.02em] mb-2">
            Five treatments for the section under the cards
          </p>
          <p className="text-[14px] text-white/50 max-w-3xl leading-relaxed">
            None of these are bullet lists or bordered rectangles — annotated callouts, a switchable
            mockup, dark editorial type, a chat narrative, and abstract trust icons.
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
