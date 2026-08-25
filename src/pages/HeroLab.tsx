import {
  HeroPixelWard,
  HeroCinematic,
  HeroOrbit,
  HeroDossier,
  HeroLedgerBand,
  HeroDraftingTable,
  HeroSplitBrief,
} from "@/components/landing/heroes/LabHeroes";

/**
 * Hero lab — a separate route. The production Landing page is untouched and
 * imports nothing from here.
 */

const VARIANTS = [
  {
    n: "H1",
    name: "Pixel Ward",
    ref: "The Bridge",
    note: "Pixel-art scene on warm cream, serif display with one italic phrase, mono subhead under a caps eyebrow. The queue is drawn rather than described — films in a row, the urgent one sliding to the front. Highest-risk: charming can read as unserious to a radiologist, but nobody forgets it.",
    C: HeroPixelWard,
  },
  {
    n: "H2",
    name: "Cinematic",
    ref: "Legora",
    note: "Full-bleed dark field, thin announcement bar above the nav, huge tight sans set low with the CTA beside a one-line qualifier. Uses a treated radiographic field instead of footage — stock video of a doctor is the most generic asset in healthcare marketing.",
    C: HeroCinematic,
  },
  {
    n: "H3",
    name: "Orbit",
    ref: "Starcloud",
    note: "Floating pill nav over a full-bleed field, statement centred high, three hairline-ruled columns sitting directly on the image. The rules are the signature — they turn a background into a structured page.",
    C: HeroOrbit,
  },
  {
    n: "H4",
    name: "Dossier",
    ref: "Petrarch",
    note: "Dark editorial. Numbered section label, serif heading, a framed panel holding the waiting queue, serif-italic marginalia bleeding off the right edge. Treats the problem as a subject worth studying rather than a pain point to agitate.",
    C: HeroDossier,
  },
  {
    n: "H5",
    name: "Ledger Band",
    ref: "Forward",
    note: "Serif statement over a three-up stat band — inverted so the numbers describe THE PROBLEM, not Kroix's results. A stat band normally invites invented metrics; pointing it at the problem keeps the format's authority and stays honest.",
    C: HeroLedgerBand,
  },
  {
    n: "H6",
    name: "Drafting Table",
    ref: "RunInfra",
    note: "Light ground, faint drafting grid, statement left and a working panel right showing the queue reorder by time-to-target. The most product-forward of the seven and the only one where the visitor sees the thing itself in the fold.",
    C: HeroDraftingTable,
  },
  {
    n: "H7",
    name: "Split Brief",
    ref: "Bento model APIs",
    note: "Hairline two-column split giving the problem and the response equal weight under small mono labels. The most information-dense and least emotive — closest to a technical datasheet.",
    C: HeroSplitBrief,
  },
];

export default function HeroLab() {
  return (
    <div className="bg-kx-canvas">
      <div className="sticky top-0 z-50 bg-kx-ink text-white px-8 py-3 flex items-center justify-between">
        <span className="font-display font-semibold text-[15px]">Kroix · hero lab</span>
        <div className="flex items-center gap-4">
          {[
            ["/", "live site"],
            ["/worklist-variants", "worklist"],
            ["/reader-variants", "reader"],
            ["/analytics-variants", "analytics"],
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

      <div className="px-8 py-9 bg-kx-ink text-white">
        <div className="max-w-6xl mx-auto">
          <p className="font-display text-[22px] font-medium tracking-[-0.02em] mb-2">
            H-series · seven heroes for the redesigned scope
          </p>
          <p className="text-[14px] text-white/50 max-w-3xl leading-relaxed">
            Demo route. The live landing page is unchanged and imports none of this. All seven argue
            the same thesis — worklists are read in arrival order, the medium band waits longest
            because nothing sorts it, Kroix orders by time-to-target — so the only variable is the
            treatment.
          </p>
          <p className="text-[13px] text-white/35 max-w-3xl leading-relaxed mt-3">
            Every variant states pre-clearance status in the fold, captures email instead of
            promising a demo, and makes no claim about Kroix's performance. Where numbers appear
            they describe the problem, not the product.
          </p>
        </div>
      </div>

      {VARIANTS.map(({ n, name, ref, note, C }) => (
        <div key={n}>
          <div className="px-8 py-5 bg-kx-surface2 border-y border-kx-border">
            <div className="max-w-6xl mx-auto flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-mono text-[13px] text-kx-critical font-semibold">{n}</span>
              <span className="font-display text-[17px] font-medium text-kx-ink">{name}</span>
              <span className="font-mono text-[11.5px] text-kx-muted">after {ref}</span>
              <span className="text-[13px] text-kx-muted w-full">{note}</span>
            </div>
          </div>
          <C />
        </div>
      ))}
    </div>
  );
}
