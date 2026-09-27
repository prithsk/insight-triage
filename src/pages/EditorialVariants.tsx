import {
  EditorialFocus,
  EditorialSplit,
  EditorialIndex,
  EditorialBrief,
} from "@/components/dashboard/EditorialVariants";

const VARIANTS = [
  {
    n: "E1",
    name: "Focus",
    note:
      "Harvey's stacked phrase list, taken literally. The study to read next is the only thing at full contrast; the rest fade and shrink behind it. Hover or tab to promote a row. The most opinionated of the four — it makes the queue feel like a decision rather than a list.",
    C: EditorialFocus,
  },
  {
    n: "E2",
    name: "Split",
    note:
      "Moda's dark statement panel beside a light data panel. The left half says what the queue means in one sentence and carries the three numbers; the right half is the whole queue, dense. Closest to shippable — it keeps every row visible.",
    C: EditorialSplit,
  },
  {
    n: "E3",
    name: "Index",
    note:
      "Petrarch and Silicon Hills: numbered entries, hairline rules, severity as a word set in the margin rather than a coloured chip. The queue as a printed index. Highest information density of the editorial four.",
    C: EditorialIndex,
  },
  {
    n: "E4",
    name: "Brief",
    note:
      "RonanRx's clinical page, applied to the reviewer rather than the worklist. One study stated as a sentence, provenance printed in mono beside it instead of hidden in a tooltip — including what the system does NOT know.",
    C: EditorialBrief,
  },
];

export default function EditorialVariants() {
  return (
    <div className="bg-kx-paper">
      <div className="sticky top-0 z-50 bg-kx-paper-ink text-white px-8 py-3 flex items-center justify-between">
        <span className="font-display font-semibold text-[15px]">Kroix · editorial variants</span>
        <div className="flex items-center gap-4">
          {[
            ["/worklist-variants", "W-series"],
            ["/reader-variants", "reader"],
            ["/analytics-variants", "analytics"],
            ["/hero-variants", "hero"],
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

      <div className="px-8 py-10 bg-kx-paper-ink text-white">
        <div className="max-w-6xl mx-auto">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/40 mb-4">
            E-series
          </p>
          <p className="font-editorial text-[38px] leading-[1.1] mb-5 max-w-3xl">
            The worklist as a document, not an application.
          </p>
          <p className="text-[14px] text-white/55 max-w-3xl leading-relaxed">
            Sixteen design references were collected for this product — Harvey, Moda, Petrarch,
            Forward, RonanRx, The Bridge, Strength Atlas, Silicon Hills, Rivet. None of them is a
            dashboard, and all of them make the same five moves: warm off-white ground, editorial
            serif on the one line that matters, mono for identifiers and provenance, a tiny
            uppercase label where a heading would go, and near-monochrome so the focused thing is
            the only thing at full contrast.
          </p>
          <p className="text-[13px] text-white/35 max-w-3xl leading-relaxed mt-3">
            All four render the same eight sample studies in the same order the live worklist uses
            — closest to breaching its read-time target first. Only the voice changes. What to
            compare: whether you can tell what to open next without reading, whether the density
            survives a real queue of forty, and whether it still looks like clinical software or
            has drifted into a magazine.
          </p>
          <p className="font-mono text-[11px] text-white/30 mt-5">
            Warm ground is <span className="text-white/55">kx-paper #F7F6F3</span>, additive — the
            live app and landing page still use <span className="text-white/55">kx-surface #F6F7F9</span>,
            which is blue-cast. Nothing shifts until one of these is chosen.
          </p>
        </div>
      </div>

      {VARIANTS.map(({ n, name, note, C }) => (
        <div key={n}>
          <div className="px-8 py-5 bg-kx-paper2 border-y border-kx-paper-line">
            <div className="max-w-6xl mx-auto flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-mono text-[13px] text-kx-critical-ink font-semibold">{n}</span>
              <span className="font-editorial text-[22px] text-kx-paper-ink">{name}</span>
              <span className="text-[13px] text-kx-paper-muted w-full max-w-3xl leading-relaxed">
                {note}
              </span>
            </div>
          </div>
          <C />
        </div>
      ))}
    </div>
  );
}
