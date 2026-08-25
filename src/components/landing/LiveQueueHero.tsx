import { useEffect, useRef, useState } from "react";

/**
 * Worklist demo for the landing page.
 *
 * WHAT THIS USED TO DO, AND WHY IT WAS WRONG. This component previously
 * jittered every study's score with `Math.random()` every 2.6 seconds and
 * rendered the result under the heading "Live worklist" beside a pulsing green
 * dot. Two separate defects:
 *
 *   1. It claimed to be live. Nothing here is connected to anything. That is
 *      the same class of fabrication as the `Math.random()` throughput chart
 *      removed in 24b7af1 — synthetic data wearing a live badge — and it was
 *      the last one still shipping.
 *
 *   2. The scores moved. A study's score is computed once, at inference. The
 *      finding on a chest radiograph does not change while the study sits in a
 *      queue, so a film drifting from CLEAR to CRITICAL and back depicts
 *      something that cannot happen and undercuts the product's own claim to
 *      be traceable.
 *
 * WHAT IT DOES NOW. It animates the thing that actually changes: queue
 * membership. Studies arrive from a fixed, hand-authored sequence carrying a
 * fixed score, get inserted at the position their score earns, and the read
 * one leaves. The reorder animation — which is the product's entire thesis —
 * is preserved. Only the dishonest part is gone.
 *
 * RULES FOR ANYONE EDITING THIS:
 *   - No `Math.random()`. Ever. Not for scores, not for timings, not for ids.
 *   - No "live", no pulsing status dot, no timestamp, no counter that implies
 *     a feed. It is labelled a demo loop and must stay labelled a demo loop.
 *   - A study's `score` is immutable once it enters the queue.
 *   - Scores are bimodal on purpose: the ensemble is a binary abnormal-vs-normal
 *     classifier reporting 98.9% on 5-fold CV, and a classifier that separates
 *     that well is rarely unsure. Values clustered around 0.5 would depict a
 *     model that cannot tell its two classes apart.
 */

interface QueueItem {
  id: string;
  label: string;
  /** Fixed at inference. Never mutated after the study enters the queue. */
  score: number;
}

const BUCKET = (score: number) =>
  score >= 0.65 ? "CRITICAL" : score >= 0.35 ? "REVIEW" : "CLEAR";

const BUCKET_DOT: Record<string, string> = {
  CRITICAL: "bg-kx-critical",
  REVIEW: "bg-amber-400",
  CLEAR: "bg-emerald-400",
};

/** Opening state of the demo loop. */
const INITIAL: QueueItem[] = [
  { id: "C48D02", label: "CXR · ICU-1", score: 0.97 },
  { id: "E60F71", label: "CXR · ICU-4", score: 0.93 },
  { id: "9A3C5D", label: "CXR · ER-1", score: 0.89 },
  { id: "7F2A91", label: "CXR · ER-3", score: 0.06 },
  { id: "1B7E4F", label: "CXR · Rad-2", score: 0.03 },
];

/**
 * Studies that arrive over the loop, in order. Each carries the score it was
 * given at inference. The loop cycles, so the demo runs indefinitely without
 * ever inventing a value.
 */
const ARRIVALS: QueueItem[] = [
  { id: "B71C39", label: "CXR · ER-2", score: 0.99 },
  { id: "4D8E12", label: "CXR · Ward-6", score: 0.04 },
  { id: "A05B7C", label: "CXR · ICU-2", score: 0.91 },
  { id: "2E9F44", label: "CXR · Rad-1", score: 0.02 },
];

const ROW_HEIGHT = 56;
const GAP = 10;
const TICK_MS = 2600;

export function LiveQueueHero() {
  const [items, setItems] = useState<QueueItem[]>(
    [...INITIAL].sort((a, b) => b.score - a.score)
  );
  const arrival = useRef(0);
  const reducedMotion = useRef(false);

  useEffect(() => {
    // JS-driven state changes cannot be stopped by CSS, so the check has to
    // happen here. Under reduced motion the queue simply holds its opening
    // state, which is still fully legible.
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion.current) return;

    const interval = setInterval(() => {
      setItems((prev) => {
        const next = ARRIVALS[arrival.current % ARRIVALS.length];
        arrival.current += 1;

        // The lowest-priority study is read and leaves; the new one is inserted
        // at whatever position its fixed score earns. No score is ever changed.
        const remaining = prev.slice(0, -1).filter((i) => i.id !== next.id);
        return [...remaining, next].sort((a, b) => b.score - a.score);
      });
    }, TICK_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="relative rounded-2xl border border-kx-border bg-kx-surface/60 backdrop-blur-sm p-4"
      style={{ height: items.length * (ROW_HEIGHT + GAP) + 16 }}
    >
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-kx-muted uppercase tracking-wider">
        <span>Worklist demo</span>
        <span>Sorted by score</span>
      </div>

      <div className="relative mt-9" style={{ height: items.length * (ROW_HEIGHT + GAP) }}>
        {items.map((item, index) => {
          const bucket = BUCKET(item.score);
          return (
            <div
              key={item.id}
              className="absolute left-0 right-0 flex items-center gap-3 px-4 rounded-xl border border-kx-border bg-kx-surface2"
              style={{
                height: ROW_HEIGHT,
                transform: `translateY(${index * (ROW_HEIGHT + GAP)}px)`,
                transition: "transform 900ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${BUCKET_DOT[bucket]}`} />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[12px] text-kx-ink truncate">{item.id}</p>
                <p className="text-[11px] text-kx-muted truncate">{item.label}</p>
              </div>
              <span className="font-mono text-[12px] text-kx-muted flex-shrink-0">
                {(item.score * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>

      <p className="absolute -bottom-6 left-0 font-mono text-[10.5px] text-kx-muted/70">
        Illustrative loop. Not patient data, not a live feed.
      </p>
    </div>
  );
}
