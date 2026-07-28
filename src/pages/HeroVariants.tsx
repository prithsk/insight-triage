import { HeroBAClassic } from "@/components/landing/heroes/HeroBAClassic";
import { HeroBAStacked } from "@/components/landing/heroes/HeroBAStacked";
import { HeroBADark } from "@/components/landing/heroes/HeroBADark";
import { HeroBAOverlap } from "@/components/landing/heroes/HeroBAOverlap";
import { HeroBAFocus } from "@/components/landing/heroes/HeroBAFocus";
import { HeroFoldCinematic } from "@/components/landing/heroes/HeroFoldCinematic";
import { HeroFoldEditorial } from "@/components/landing/heroes/HeroFoldEditorial";
import { HeroFoldDarkFilm } from "@/components/landing/heroes/HeroFoldDarkFilm";
import { HeroFoldStatement } from "@/components/landing/heroes/HeroFoldStatement";
import { HeroFoldVeil } from "@/components/landing/heroes/HeroFoldVeil";
import { HeroFoldClean } from "@/components/landing/heroes/HeroFoldClean";

/** E-series: CTAs inside the first fold, worklist + autoplaying app tour below. */
const NEW_VARIANTS = [
  {
    n: "E1",
    name: "Cinematic",
    slogan: "“Urgency decides the reading order.”",
    note: "Legora-style footage fold. Statement line + both CTAs, nothing else above the scroll. Worklist and full app tour follow on light canvas.",
    C: HeroFoldCinematic,
  },
  {
    n: "E2",
    name: "Editorial",
    slogan: "“The sickest patient shouldn't be fifth in line.”",
    note: "Harvey-style serif restraint. Statement left, plain-English explanation + proof stats right. No product chrome in the fold.",
    C: HeroFoldEditorial,
  },
  {
    n: "E3",
    name: "Dark Film",
    slogan: "“Triage software for radiology.”",
    note: "Whole page stays on the dark stage — hero, worklist and tour all in dark mode. Opens like a product film.",
    C: HeroFoldDarkFilm,
  },
  {
    n: "E4",
    name: "Statement",
    slogan: "“First in, is not worst off.”",
    note: "No imagery at all. One huge line, CTAs directly beneath, and a single hairline FIFO strip that makes the argument.",
    C: HeroFoldStatement,
  },
  {
    n: "E5",
    name: "Veil",
    slogan: "“Every scan scored. The urgent one surfaced.”",
    note: "Footage behind a narrow centred column that fades into the light canvas. Model names as a quiet credit line.",
    C: HeroFoldVeil,
  },
  {
    n: "E6",
    name: "Clean Cut",
    slogan: "“Urgency decides the reading order.”",
    note: "Same footage fold as E1, but no bottom gradient dissolve — a flat hard edge straight into the next section, like Legora/Harvey. Less produced, more plain banner.",
    C: HeroFoldClean,
  },
];

const VARIANTS = [
  {
    n: "D1",
    name: "Classic Side-by-Side",
    slogan: "“Your sickest patient is fifth in line.”",
    note: "The layout you liked, now with the Grad-CAM viewer auto-expanding under the live list.",
    C: HeroBAClassic,
  },
  {
    n: "D2",
    name: "Vertical Narrative",
    slogan: "“Your sickest patient is last in the queue.”",
    note: "Dead list on top → big arrow → live demo below at full width. Reads top-to-bottom like a story.",
    C: HeroBAStacked,
  },
  {
    n: "D3",
    name: "Dark Stage",
    slogan: "“Five scans in. One of them can't wait.”",
    note: "FIFO list dimmed into the dark on the left, demo lit with a green glow on the right.",
    C: HeroBADark,
  },
  {
    n: "D4",
    name: "Overlap / Replace",
    slogan: "“Replace the queue that buries the urgent one.”",
    note: "The live demo physically overlaps and covers the old list, like it's taking its place.",
    C: HeroBAOverlap,
  },
  {
    n: "D5",
    name: "Demo First",
    slogan: "“The read that matters, already open.”",
    note: "Demo is the hero, centered and full width. The 'before' shrinks to a one-line FIFO proof strip.",
    C: HeroBAFocus,
  },
];

type Variant = (typeof VARIANTS)[number];

export default function HeroVariants() {
  return (
    <div className="bg-kx-canvas">
      <div className="sticky top-0 z-50 bg-kx-ink text-white px-8 py-3 flex items-center justify-between">
        <span className="font-display font-semibold text-[15px]">Kroix · hero variants</span>
        <div className="flex items-center gap-4">
          <a href="/about-variants" className="font-mono text-[12px] text-white/50 hover:text-white transition-colors">
            about variants →
          </a>
          <a href="/info-variants" className="font-mono text-[12px] text-white/50 hover:text-white transition-colors">
            info variants →
          </a>
        </div>
      </div>

      <GroupHeader
        title="E-series · new"
        blurb="Both CTAs sit inside the first fold. The live worklist moves below it, followed by an autoplaying tour of the real app (dashboard → study → reviewer → analytics). Display type is Inter Tight / Instrument Serif — no Space Grotesk."
      />
      {NEW_VARIANTS.map((v) => (
        <VariantBlock key={v.n} {...v} />
      ))}

      <GroupHeader
        title="D-series · previous"
        blurb="The before/after set. Kept for comparison — D1, D4 and D5 were the ones you liked."
      />
      {VARIANTS.map((v: Variant) => (
        <VariantBlock key={v.n} {...v} />
      ))}
    </div>
  );
}

function GroupHeader({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="px-8 py-8 bg-kx-ink text-white">
      <div className="max-w-6xl mx-auto">
        <p className="font-display text-[22px] font-medium tracking-[-0.02em] mb-2">{title}</p>
        <p className="text-[14px] text-white/50 max-w-3xl leading-relaxed">{blurb}</p>
      </div>
    </div>
  );
}

function VariantBlock({
  n,
  name,
  slogan,
  note,
  C,
}: {
  n: string;
  name: string;
  slogan: string;
  note: string;
  C: () => JSX.Element;
}) {
  return (
    <div>
      <div className="px-8 py-5 bg-kx-surface2 border-y border-kx-border">
        <div className="max-w-6xl mx-auto flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="font-mono text-[13px] text-kx-critical font-semibold">{n}</span>
          <span className="font-display text-[17px] font-medium text-kx-ink">{name}</span>
          <span className="font-editorial text-[17px] text-kx-accent2">{slogan}</span>
          <span className="text-[13px] text-kx-muted w-full">{note}</span>
        </div>
      </div>
      <C />
    </div>
  );
}
