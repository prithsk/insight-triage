import { useEffect, useRef, useState } from "react";

interface Study {
  id: string;
  loc: string;
  score: number | null;
  isNew?: boolean;
}

const BASE: Study[] = [
  { id: "1B7E4F", loc: "Rad-2 · routine", score: 0.12 },
  { id: "9A3C5D", loc: "ER-1 · walk-in", score: 0.54 },
  { id: "7F2A91", loc: "ER-3 · follow-up", score: 0.31 },
  { id: "E60F71", loc: "ICU-4 · post-op", score: 0.22 },
];

const INCOMING: Study = { id: "C48D02", loc: "ICU-1 · resp. distress", score: null, isNew: true };

const bucket = (s: number) => (s >= 0.65 ? "CRITICAL" : s >= 0.35 ? "REVIEW" : "CLEAR");
const dotFor = (s: number) =>
  s >= 0.65 ? "bg-kx-critical" : s >= 0.35 ? "bg-amber-400" : "bg-emerald-400";
const textFor = (s: number) =>
  s >= 0.65 ? "text-kx-critical" : s >= 0.35 ? "text-amber-500" : "text-emerald-500";

/**
 * A looping, code-driven product demo: a scan arrives, three models score it,
 * and the worklist visibly reorders to put it first. Freezes on the final
 * state under prefers-reduced-motion.
 */
export function ProductDemo({ dark = false }: { dark?: boolean }) {
  // phase 0 idle · 1 arriving · 2 scoring · 3 scored+reordered · 4 hold
  const [phase, setPhase] = useState(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) {
      setPhase(3);
      return;
    }
    const timings = [1400, 1100, 1600, 2600, 900];
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const step = () => {
      t = setTimeout(() => {
        i = (i + 1) % 5;
        setPhase(i);
        step();
      }, timings[i]);
    };
    step();
    return () => clearTimeout(t);
  }, []);

  const scored = phase >= 3;
  const incoming: Study = { ...INCOMING, score: scored ? 0.88 : null };
  const rows = scored ? [incoming, ...BASE] : [...BASE, ...(phase >= 1 ? [incoming] : [])];

  const shell = dark
    ? "bg-[#111417] border-white/10"
    : "bg-white border-kx-border";
  const chrome = dark ? "bg-white/[0.04] border-white/10" : "bg-kx-surface2/70 border-kx-border";
  const rowBg = dark ? "bg-white/[0.03] border-white/[0.07]" : "bg-white border-kx-border";
  const idText = dark ? "text-white" : "text-kx-ink";
  const subText = dark ? "text-white/40" : "text-kx-muted";

  const statusLine =
    phase === 0 ? "Watching queue…"
    : phase === 1 ? "New study received · C48D02"
    : phase === 2 ? "Running ensemble · 3 models"
    : "Queue reordered · C48D02 moved to position 1";

  return (
    <div className={`rounded-xl border overflow-hidden shadow-[0_30px_80px_-30px_rgba(18,21,26,0.45)] ${shell}`}>
      {/* window chrome */}
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${chrome}`}>
        <span className="w-2.5 h-2.5 rounded-full bg-kx-critical/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
        <span className={`font-mono text-[11px] ml-2 ${subText}`}>kroix · worklist</span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className={`font-mono text-[10px] uppercase tracking-wider ${subText}`}>live</span>
        </span>
      </div>

      {/* rows */}
      <div className="p-3 sm:p-4 space-y-2 min-h-[248px]">
        {rows.map((s, i) => {
          const isTarget = s.id === INCOMING.id;
          const showScoring = isTarget && phase === 2;
          return (
            <div
              key={s.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-700 ease-out ${rowBg} ${
                isTarget && phase >= 1 ? "ring-1 ring-kx-critical/40" : ""
              }`}
              style={{
                opacity: isTarget && phase === 0 ? 0 : 1,
                transform: `translateY(0)`,
              }}
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-500 ${
                  s.score === null ? (dark ? "bg-white/25" : "bg-kx-muted/40") : dotFor(s.score)
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className={`font-mono text-[12px] truncate ${idText}`}>{s.id}</p>
                <p className={`text-[11px] truncate ${subText}`}>{s.loc}</p>
              </div>

              {showScoring ? (
                <span className="flex items-center gap-1">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="w-1.5 h-1.5 rounded-full bg-kx-critical animate-bounce"
                      style={{ animationDelay: `${d * 120}ms` }}
                    />
                  ))}
                </span>
              ) : s.score === null ? (
                <span className={`font-mono text-[11px] ${subText}`}>queued</span>
              ) : (
                <span className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      dark ? "bg-white/5" : "bg-kx-surface"
                    } ${textFor(s.score)}`}
                  >
                    {bucket(s.score)}
                  </span>
                  <span className={`font-mono text-[12px] w-9 text-right ${textFor(s.score)}`}>
                    {(s.score * 100).toFixed(0)}%
                  </span>
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* status bar */}
      <div className={`px-4 py-2.5 border-t flex items-center gap-2 ${chrome}`}>
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            scored ? "bg-emerald-400" : "bg-kx-critical animate-pulse"
          }`}
        />
        <span className={`font-mono text-[11px] ${subText}`}>{statusLine}</span>
      </div>
    </div>
  );
}
