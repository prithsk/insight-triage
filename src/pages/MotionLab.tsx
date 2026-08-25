import { useState } from "react";
import {
  ThreadDeck,
  ThreadPlayhead,
  ThreadConveyor,
  ThreadTrace,
  ThreadStack,
} from "@/components/landing/motion/ThreadedPages";

/**
 * Motion lab — a switcher, not a gallery.
 *
 * Every variant here is threaded by a scroll-linked motif that needs the whole
 * page scroll to itself. Stacking them the way the other galleries stack
 * sections would make each one read the page's total scroll and fight the
 * others. So this picks one at a time.
 *
 * The production Landing page imports none of this.
 */

const VARIANTS = [
  {
    id: "deck",
    n: "M1",
    name: "Deck",
    ref: "The Bridge",
    motion: "horizontal traveller",
    note: "A pixel suspension deck spans the page. Its cable sags and rises with scroll while one study rides across it — arriving at one end and read at the other. Cream ground, rust structure, the reference's palette taken directly.",
    C: ThreadDeck,
  },
  {
    id: "playhead",
    n: "M2",
    name: "Playhead",
    ref: "line-art clinical",
    motion: "vertical descent",
    note: "A time spine down the left edge marked at the real SLA windows. A playhead descends it as you scroll and the elapsed readout climbs; past the 4h mark the spine turns red. Distance down the page literally equals elapsed time.",
    C: ThreadPlayhead,
  },
  {
    id: "conveyor",
    n: "M3",
    name: "Conveyor",
    ref: "horizontal ↔ vertical",
    motion: "horizontal belt",
    note: "A filmstrip runs along the bottom, translating left as you scroll down, with a fixed reticle marking the study being read. Vertical input, horizontal output — and it makes the queue feel like a belt you cannot speed up.",
    C: ThreadConveyor,
  },
  {
    id: "trace",
    n: "M4",
    name: "Trace",
    ref: "monitor line-art",
    motion: "line draws in",
    note: "One continuous polyline drawn down the full page, revealed by stroke-dashoffset. Flat while nothing sorts the queue, spiking where the critical study appears, settling into rhythm after the reorder. Phosphor amber on slate.",
    C: ThreadTrace,
  },
  {
    id: "stack",
    n: "M5",
    name: "Stack",
    ref: "physical reorder",
    motion: "vertical reorder",
    note: "A stack of film jackets pinned at the right. Scroll fans them apart, the urgent study climbs from fifth to first, then the stack closes in its new order. The only motif where the reordering IS the animation.",
    C: ThreadStack,
  },
];

export default function MotionLab() {
  const [active, setActive] = useState(VARIANTS[0]);
  const Active = active.C;

  return (
    <div>
      <div className="sticky top-0 z-[100] bg-kx-ink text-white">
        <div className="px-6 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="font-display font-semibold text-[15px]">Kroix · motion lab</span>

          <div className="flex flex-wrap gap-1">
            {VARIANTS.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setActive(v);
                  window.scrollTo({ top: 0 });
                }}
                className={
                  "px-3 py-1.5 rounded-md font-mono text-[12px] transition-colors " +
                  (active.id === v.id ? "bg-white text-kx-ink" : "text-white/50 hover:text-white hover:bg-white/10")
                }
              >
                {v.n} {v.name}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-4">
            {[
              ["/", "live site"],
              ["/hero-lab", "heroes"],
              ["/worklist-variants", "worklist"],
              ["/analytics-variants", "analytics"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="font-mono text-[12px] text-white/45 hover:text-white transition-colors">
                {label} →
              </a>
            ))}
          </div>
        </div>

        <div className="px-6 pb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-white/10 pt-2.5">
          <span className="font-mono text-[11.5px] text-kx-critical">{active.n}</span>
          <span className="font-mono text-[11.5px] text-white/45">after {active.ref}</span>
          <span className="font-mono text-[11.5px] text-white/45">· {active.motion}</span>
          <span className="text-[12.5px] text-white/40 w-full max-w-4xl leading-relaxed">{active.note}</span>
        </div>
      </div>

      <Active key={active.id} />
    </div>
  );
}
