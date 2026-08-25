import {
  WorklistLedger,
  WorklistRail,
  WorklistLanes,
  WorklistClock,
  WorklistConsole,
} from "@/components/dashboard/WorklistVariants";

const VARIANTS = [
  {
    n: "W1",
    name: "Ledger",
    note: "RunInfra's baseline/optimized/delta table. Real <table>, hairline rows, tabular numerals, severity as a 3px left rule instead of a badge. Most rows per screen of the five.",
    C: WorklistLedger,
  },
  {
    n: "W2",
    name: "Rail + Reader",
    note: "herdr's left rail beside a working pane. The queue never leaves the screen, so opening a study is not a navigation. Closest to how PACS worklists actually behave.",
    C: WorklistRail,
  },
  {
    n: "W3",
    name: "Lanes",
    note: "Three severity columns. Column height tells you the shape of the queue at a glance — but it buries wait time, which is the number that actually matters.",
    C: WorklistLanes,
  },
  {
    n: "W4",
    name: "Clock",
    note: "Ordered by proximity to the read-time target, bar showing elapsed vs target. The only variant whose primary axis is the metric Kroix claims to move.",
    C: WorklistClock,
  },
  {
    n: "W5",
    name: "Console",
    note: "herdr's dark terminal taken literally. Monospace throughout, keyboard hints per row, no decorative colour. Easiest on the eye in a dim reading room; breaks with every other surface in the product.",
    C: WorklistConsole,
  },
];

export default function WorklistVariants() {
  return (
    <div className="bg-kx-canvas">
      <div className="sticky top-0 z-50 bg-kx-ink text-white px-8 py-3 flex items-center justify-between">
        <span className="font-display font-semibold text-[15px]">Kroix · worklist variants</span>
        <div className="flex items-center gap-4">
          {[
            ["/hero-variants", "hero"],
            ["/about-variants", "about"],
            ["/info-variants", "info"],
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
            W-series · the worklist
          </p>
          <p className="text-[14px] text-white/50 max-w-3xl leading-relaxed">
            Five layouts for the screen a radiologist would sit in all day. All five render the
            same eight sample studies, so the only variable is the layout. The current dashboard
            uses hover-lifting cards under a 48px marketing headline — none of these do.
          </p>
          <p className="text-[13px] text-white/35 max-w-3xl leading-relaxed mt-3">
            What to compare: how many rows you can scan without scrolling, whether wait time is
            visible without reading, and whether opening a study costs you the list.
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
