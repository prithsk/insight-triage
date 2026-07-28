import { useEffect, useRef, useState } from "react";

interface QueueItem {
  id: string;
  label: string;
  score: number;
}

const BUCKET = (score: number) =>
  score >= 0.65 ? "CRITICAL" : score >= 0.35 ? "REVIEW" : "CLEAR";

const BUCKET_DOT: Record<string, string> = {
  CRITICAL: "bg-kx-critical",
  REVIEW: "bg-amber-400",
  CLEAR: "bg-emerald-400",
};

const INITIAL: QueueItem[] = [
  { id: "7F2A91", label: "CXR · ER-3", score: 0.31 },
  { id: "C48D02", label: "CXR · ICU-1", score: 0.88 },
  { id: "1B7E4F", label: "CXR · Rad-2", score: 0.12 },
  { id: "9A3C5D", label: "CXR · ER-1", score: 0.54 },
  { id: "E60F71", label: "CXR · ICU-4", score: 0.72 },
];

const ROW_HEIGHT = 56;
const GAP = 10;

export function LiveQueueHero() {
  const [items, setItems] = useState<QueueItem[]>(
    [...INITIAL].sort((a, b) => b.score - a.score)
  );
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion.current) return;

    const interval = setInterval(() => {
      setItems((prev) => {
        const jittered = prev.map((item) => ({
          ...item,
          score: Math.min(0.97, Math.max(0.04, item.score + (Math.random() - 0.5) * 0.35)),
        }));
        return jittered.sort((a, b) => b.score - a.score);
      });
    }, 2600);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="relative rounded-2xl border border-kx-border bg-kx-surface/60 backdrop-blur-sm p-4"
      style={{ height: items.length * (ROW_HEIGHT + GAP) + 16 }}
    >
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-kx-muted uppercase tracking-wider">
        <span>Live worklist</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          sorting by urgency
        </span>
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
    </div>
  );
}
