import { useEffect, useRef, useState } from "react";
import scanImg from "@/assets/landing/feature-analysis.jpg";

interface Study {
  id: string;
  loc: string;
  score: number | null;
}

const BASE: Study[] = [
  { id: "1B7E4F", loc: "Rad-2 · routine", score: 0.12 },
  { id: "9A3C5D", loc: "ER-1 · walk-in", score: 0.54 },
  { id: "7F2A91", loc: "ER-3 · follow-up", score: 0.31 },
  { id: "E60F71", loc: "ICU-4 · post-op", score: 0.22 },
];

const TARGET = { id: "C48D02", loc: "ICU-1 · resp. distress" };

const MODELS = [
  { name: "densenet121", score: 0.88 },
  { name: "googlenet", score: 0.85 },
  { name: "resnet18", score: 0.79 },
];

const bucket = (s: number) => (s >= 0.65 ? "CRITICAL" : s >= 0.35 ? "REVIEW" : "CLEAR");
const dotFor = (s: number) =>
  s >= 0.65 ? "bg-kx-critical" : s >= 0.35 ? "bg-amber-400" : "bg-emerald-400";
const textFor = (s: number) =>
  s >= 0.65 ? "text-kx-critical" : s >= 0.35 ? "text-amber-500" : "text-emerald-500";

/**
 * Looping demo: a study arrives, gets scored, jumps to the top of the worklist,
 * then a viewer panel expands open BELOW the list showing the Grad-CAM read.
 * Freezes fully-open under prefers-reduced-motion.
 *
 * Phases: 0 idle · 1 arriving · 2 scoring · 3 reordered · 4 opening · 5 open/hold
 */
export function ProductDemoExpanding({ dark = false }: { dark?: boolean }) {
  const [phase, setPhase] = useState(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) {
      setPhase(5);
      return;
    }
    const timings = [1200, 1000, 1500, 1200, 600, 3200];
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const step = () => {
      t = setTimeout(() => {
        i = (i + 1) % timings.length;
        setPhase(i);
        step();
      }, timings[i]);
    };
    step();
    return () => clearTimeout(t);
  }, []);

  const scored = phase >= 3;
  const isOpen = phase >= 4;
  const target: Study = { ...TARGET, score: scored ? 0.86 : null };
  const rows = scored ? [target, ...BASE] : [...BASE, ...(phase >= 1 ? [target] : [])];

  const shell = dark ? "bg-[#111417] border-white/10" : "bg-white border-kx-border";
  const chrome = dark ? "bg-white/[0.04] border-white/10" : "bg-kx-surface2/70 border-kx-border";
  const rowBg = dark ? "bg-white/[0.03] border-white/[0.07]" : "bg-white border-kx-border";
  const idText = dark ? "text-white" : "text-kx-ink";
  const subText = dark ? "text-white/40" : "text-kx-muted";
  const panelBg = dark ? "bg-black/30 border-white/10" : "bg-kx-surface border-kx-border";

  const status =
    phase === 0 ? "Watching queue…"
    : phase === 1 ? "New study received · C48D02"
    : phase === 2 ? "Running ensemble · 3 models"
    : phase === 3 ? "Queue reordered · C48D02 → position 1"
    : "Opening study · Grad-CAM ready";

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

      {/* worklist */}
      <div className="p-3 sm:p-4 space-y-2">
        {rows.map((s) => {
          const isTarget = s.id === TARGET.id;
          const scoring = isTarget && phase === 2;
          return (
            <div
              key={s.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-700 ease-out ${rowBg} ${
                isTarget && phase >= 1 ? "ring-1 ring-kx-critical/40" : ""
              }`}
              style={{ opacity: isTarget && phase === 0 ? 0 : 1 }}
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
              {scoring ? (
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
                      dark ? "bg-white/5" : "bg-kx-surface2"
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

      {/* viewer panel that expands open BELOW the list */}
      <div
        className="overflow-hidden transition-[max-height,opacity] duration-[700ms] ease-out"
        style={{ maxHeight: isOpen ? 260 : 0, opacity: isOpen ? 1 : 0 }}
      >
        <div className={`mx-3 sm:mx-4 mb-3 sm:mb-4 rounded-lg border ${panelBg} p-3 sm:p-4`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`font-mono text-[11px] ${idText}`}>C48D02 · chest_xray.dcm</span>
            <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-kx-critical text-white">
              Critical 86%
            </span>
          </div>

          <div className="grid grid-cols-[132px_1fr] gap-4">
            {/* scan + heatmap */}
            <div className="relative rounded-md overflow-hidden aspect-square">
              <img src={scanImg} alt="" aria-hidden="true" className="w-full h-full object-cover" />
              <div
                className="absolute inset-0 transition-opacity duration-700"
                style={{
                  opacity: isOpen ? 1 : 0,
                  background:
                    "radial-gradient(closest-side at 38% 44%, rgba(232,80,58,0.75), rgba(232,80,58,0.25) 55%, transparent 72%)",
                  mixBlendMode: "screen",
                }}
              />
              <span className="absolute bottom-1 left-1 font-mono text-[8px] uppercase tracking-wider text-white/80 bg-black/50 px-1 py-0.5 rounded">
                grad-cam
              </span>
            </div>

            {/* per-model scores */}
            <div className="space-y-2 self-center">
              {MODELS.map((m, i) => (
                <div key={m.name} className="flex items-center gap-2">
                  <span className={`font-mono text-[10px] w-[86px] flex-shrink-0 ${subText}`}>
                    {m.name}
                  </span>
                  <div
                    className={`flex-1 h-1.5 rounded-full overflow-hidden ${
                      dark ? "bg-white/10" : "bg-kx-surface2"
                    }`}
                  >
                    <div
                      className="h-full rounded-full bg-kx-critical transition-[width] duration-[900ms] ease-out"
                      style={{
                        width: isOpen ? `${m.score * 100}%` : "0%",
                        transitionDelay: `${i * 130}ms`,
                      }}
                    />
                  </div>
                  <span className={`font-mono text-[10px] w-8 text-right ${idText}`}>
                    {m.score.toFixed(2)}
                  </span>
                </div>
              ))}
              <div className={`flex items-center gap-2 pt-1 border-t ${dark ? "border-white/10" : "border-kx-border"}`}>
                <span className={`font-mono text-[10px] w-[86px] flex-shrink-0 ${subText}`}>fused</span>
                <span className="font-mono text-[12px] text-kx-critical font-medium">0.86</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* status bar */}
      <div className={`px-4 py-2.5 border-t flex items-center gap-2 ${chrome}`}>
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isOpen ? "bg-emerald-400" : "bg-kx-critical animate-pulse"
          }`}
        />
        <span className={`font-mono text-[11px] ${subText}`}>{status}</span>
      </div>
    </div>
  );
}
