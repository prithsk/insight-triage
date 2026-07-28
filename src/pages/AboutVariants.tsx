import {
  AboutWordCycle,
  AboutLayerStack,
  AboutScatter,
  AboutManifesto,
  AboutIndex,
} from "@/components/landing/AboutSections";
import { AboutStaircase } from "@/components/landing/AboutStaircase";

const VARIANTS = [
  {
    n: "A1",
    name: "Cycling capability list",
    ref: "Harvey",
    note: "“Radiology teams use Kroix for…” with the active capability inked and the rest greyed back. Quiet, confident, no slogan.",
    C: AboutWordCycle,
  },
  {
    n: "A2",
    name: "Layered architecture",
    ref: "Legora aOS",
    note: "The stack as a physical object. Hover a layer (or let it cycle) and it lifts out while its description slides in.",
    C: AboutLayerStack,
  },
  {
    n: "A2b",
    name: "Rising staircase",
    ref: "Horizontal build",
    note: "Same build-as-you-go idea rotated horizontal. Different cards entirely — five timestamped moments in the life of one study, climbing left to right.",
    C: AboutStaircase,
  },
  {
    n: "A3",
    name: "Scattered studies",
    ref: "Loose-threads scatter",
    note: "Unordered studies drifting in space with the critical one buried among them — the problem stated visually before the fix.",
    C: AboutScatter,
  },
  {
    n: "A4",
    name: "Manifesto paragraph",
    ref: "Editorial",
    note: "One long serif paragraph on ink where only the load-bearing phrases are lit. Ends on three sharp “not a…” disclaimers.",
    C: AboutManifesto,
  },
  {
    n: "A5",
    name: "Plain index",
    ref: "Spec sheet",
    note: "The company as a table of contents. Deliberately anti-slogan — “Kroix, plainly.”",
    C: AboutIndex,
  },
];

export default function AboutVariants() {
  return (
    <div className="bg-kx-canvas">
      <div className="sticky top-0 z-50 bg-kx-ink text-white px-8 py-3 flex items-center justify-between">
        <span className="font-display font-semibold text-[15px]">Kroix · about-section variants</span>
        <div className="flex items-center gap-4">
          <a href="/hero-variants" className="font-mono text-[12px] text-white/50 hover:text-white transition-colors">
            ← hero variants
          </a>
          <a href="/info-variants" className="font-mono text-[12px] text-white/50 hover:text-white transition-colors">
            info variants →
          </a>
        </div>
      </div>

      <div className="px-8 py-8 bg-kx-ink text-white">
        <div className="max-w-6xl mx-auto">
          <p className="font-display text-[22px] font-medium tracking-[-0.02em] mb-2">
            Five replacements for the scroll-lit sentence
          </p>
          <p className="text-[14px] text-white/50 max-w-3xl leading-relaxed">
            Each one states what Kroix is in a line rather than a slogan. Pick one and the other
            four can be deleted along with ScrollHighlightText.
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
