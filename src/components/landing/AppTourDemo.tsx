import { useEffect, useRef, useState } from "react";
import scanImg from "@/assets/landing/feature-analysis.jpg";

/**
 * An autonomous, looping walkthrough of the actual product: the worklist
 * reorders, a cursor clicks the critical study, the reviewer opens with the
 * Grad-CAM read and per-model scores, the radiologist confirms, and the tour
 * ends on operational analytics before starting over.
 *
 * Nothing here is a recording — it's a scripted reconstruction of the real
 * screens, so it stays in sync with the app without a video pipeline.
 * Freezes on the reviewer scene under prefers-reduced-motion.
 */

type Scene = "worklist" | "reviewer" | "analytics";

interface Step {
  scene: Scene;
  ms: number;
  caption: string;
  /** Cursor position in % of the frame, when the cursor should be visible. */
  cursor?: { x: number; y: number };
  click?: boolean;
}

const STEPS: Step[] = [
  { scene: "worklist", ms: 1700, caption: "Studies arrive in the order they were acquired" },
  { scene: "worklist", ms: 1900, caption: "The ensemble scores each one on arrival" },
  { scene: "worklist", ms: 1800, caption: "C48D02 scores 0.86 — it jumps to position 1", cursor: { x: 52, y: 30 } },
  { scene: "worklist", ms: 700, caption: "Opening the study", cursor: { x: 52, y: 30 }, click: true },
  { scene: "reviewer", ms: 2600, caption: "Reviewer opens with the Grad-CAM overlay already rendered" },
  { scene: "reviewer", ms: 2000, caption: "Per-model scores show why the ensemble flagged it", cursor: { x: 78, y: 82 } },
  { scene: "reviewer", ms: 900, caption: "The radiologist confirms — Kroix never decides", cursor: { x: 78, y: 82 }, click: true },
  { scene: "analytics", ms: 3000, caption: "Every read feeds turnaround and agreement analytics" },
];

const STUDIES = [
  { id: "1B7E4F", loc: "Rad-2 · routine", score: 0.12 },
  { id: "9A3C5D", loc: "ER-1 · walk-in", score: 0.54 },
  { id: "7F2A91", loc: "ER-3 · follow-up", score: 0.31 },
  { id: "E60F71", loc: "ICU-4 · post-op", score: 0.22 },
];
const TARGET = { id: "C48D02", loc: "ICU-1 · resp. distress", score: 0.86 };

const MODELS = [
  { name: "densenet121", score: 0.88 },
  { name: "googlenet", score: 0.85 },
  { name: "resnet18", score: 0.79 },
];

const TURNAROUND = [
  { label: "Mon", fifo: 62, kroix: 24 },
  { label: "Tue", fifo: 58, kroix: 19 },
  { label: "Wed", fifo: 71, kroix: 26 },
  { label: "Thu", fifo: 49, kroix: 17 },
  { label: "Fri", fifo: 66, kroix: 22 },
  { label: "Sat", fifo: 40, kroix: 14 },
];

const bucket = (s: number) => (s >= 0.65 ? "CRITICAL" : s >= 0.35 ? "REVIEW" : "CLEAR");
const dotFor = (s: number) => (s >= 0.65 ? "bg-kx-critical" : s >= 0.35 ? "bg-amber-400" : "bg-emerald-400");
const textFor = (s: number) => (s >= 0.65 ? "text-kx-critical" : s >= 0.35 ? "text-amber-500" : "text-emerald-500");

const TABS: { key: Scene; label: string }[] = [
  { key: "worklist", label: "Dashboard" },
  { key: "reviewer", label: "Reviewer" },
  { key: "analytics", label: "Analytics" },
];

export function AppTourDemo({ dark = false }: { dark?: boolean }) {
  const [i, setI] = useState(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) {
      setI(4);
      return;
    }
    let t: ReturnType<typeof setTimeout>;
    let cur = 0;
    const tick = () => {
      t = setTimeout(() => {
        cur = (cur + 1) % STEPS.length;
        setI(cur);
        tick();
      }, STEPS[cur].ms);
    };
    tick();
    return () => clearTimeout(t);
  }, []);

  const step = STEPS[i];
  const scene = step.scene;
  const scored = i >= 1;
  const reordered = i >= 2;

  const shell = dark ? "bg-[#0F1216] border-white/10" : "bg-white border-kx-border";
  const chrome = dark ? "bg-white/[0.04] border-white/10" : "bg-kx-surface2/70 border-kx-border";
  const rowBg = dark ? "bg-white/[0.03] border-white/[0.07]" : "bg-white border-kx-border";
  const ink = dark ? "text-white" : "text-kx-ink";
  const sub = dark ? "text-white/45" : "text-kx-muted";
  const panel = dark ? "bg-black/30 border-white/10" : "bg-kx-surface border-kx-border";
  const hair = dark ? "border-white/10" : "border-kx-border";

  const rows = reordered ? [TARGET, ...STUDIES] : [...STUDIES, TARGET];

  return (
    <div className={`rounded-xl border overflow-hidden shadow-[0_40px_100px_-40px_rgba(18,21,26,0.5)] ${shell}`}>
      {/* browser chrome + app tabs */}
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${chrome}`}>
        <span className="w-2.5 h-2.5 rounded-full bg-kx-critical/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
        <div className="flex items-center gap-1 ml-3">
          {TABS.map((t) => (
            <span
              key={t.key}
              className={`font-mono text-[10px] px-2 py-1 rounded transition-colors duration-300 ${
                scene === t.key
                  ? dark
                    ? "bg-white/10 text-white"
                    : "bg-white text-kx-ink shadow-sm"
                  : sub
              }`}
            >
              {t.label}
            </span>
          ))}
        </div>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className={`font-mono text-[10px] uppercase tracking-wider ${sub}`}>live</span>
        </span>
      </div>

      {/* stage */}
      <div className="relative min-h-[336px]">
        {/* ── worklist ── */}
        <Pane show={scene === "worklist"}>
          <div className="p-3 sm:p-4 space-y-2">
            {rows.map((s) => {
              const isTarget = s.id === TARGET.id;
              const scoring = isTarget && i === 1;
              const show = isTarget ? scored : true;
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-700 ease-out ${rowBg} ${
                    isTarget && reordered ? "ring-1 ring-kx-critical/40" : ""
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-500 ${
                      show ? dotFor(s.score) : dark ? "bg-white/25" : "bg-kx-muted/40"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-mono text-[12px] truncate ${ink}`}>{s.id}</p>
                    <p className={`text-[11px] truncate ${sub}`}>{s.loc}</p>
                  </div>
                  {scoring && isTarget ? (
                    <span className="flex items-center gap-1">
                      {[0, 1, 2].map((d) => (
                        <span
                          key={d}
                          className="w-1.5 h-1.5 rounded-full bg-kx-critical animate-bounce"
                          style={{ animationDelay: `${d * 120}ms` }}
                        />
                      ))}
                    </span>
                  ) : !show ? (
                    <span className={`font-mono text-[11px] ${sub}`}>queued</span>
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
        </Pane>

        {/* ── reviewer ── */}
        <Pane show={scene === "reviewer"}>
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <span className={`font-mono text-[11px] ${ink}`}>C48D02 · chest_xray.dcm</span>
              <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-kx-critical text-white">
                Critical 86%
              </span>
            </div>

            <div className="grid grid-cols-[1fr_1fr] gap-4">
              <div className="relative rounded-lg overflow-hidden aspect-[4/3]">
                <img src={scanImg} alt="" aria-hidden="true" className="w-full h-full object-cover" />
                <div
                  className="absolute inset-0 transition-opacity duration-[900ms]"
                  style={{
                    opacity: scene === "reviewer" ? 1 : 0,
                    background:
                      "radial-gradient(closest-side at 38% 44%, rgba(232,80,58,0.75), rgba(232,80,58,0.25) 55%, transparent 72%)",
                    mixBlendMode: "screen",
                  }}
                />
                <span className="absolute bottom-1.5 left-1.5 font-mono text-[8px] uppercase tracking-wider text-white/85 bg-black/50 px-1.5 py-0.5 rounded">
                  grad-cam
                </span>
              </div>

              <div className={`rounded-lg border ${panel} p-3 flex flex-col justify-center`}>
                <p className={`font-mono text-[9px] uppercase tracking-[0.15em] mb-3 ${sub}`}>
                  Ensemble breakdown
                </p>
                <div className="space-y-2.5">
                  {MODELS.map((m, k) => (
                    <div key={m.name} className="flex items-center gap-2">
                      <span className={`font-mono text-[10px] w-[74px] flex-shrink-0 ${sub}`}>{m.name}</span>
                      <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${dark ? "bg-white/10" : "bg-kx-surface2"}`}>
                        <div
                          className="h-full rounded-full bg-kx-critical transition-[width] duration-[900ms] ease-out"
                          style={{
                            width: scene === "reviewer" ? `${m.score * 100}%` : "0%",
                            transitionDelay: `${k * 130}ms`,
                          }}
                        />
                      </div>
                      <span className={`font-mono text-[10px] w-8 text-right ${ink}`}>{m.score.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className={`flex items-center gap-2 mt-3 pt-2.5 border-t ${hair}`}>
                  <span className={`font-mono text-[10px] w-[74px] ${sub}`}>fused</span>
                  <span className="font-mono text-[13px] text-kx-critical font-medium">0.86</span>
                </div>

                <div className="flex gap-2 mt-4">
                  <span
                    className={`flex-1 text-center font-mono text-[10px] py-1.5 rounded transition-colors duration-300 ${
                      i >= 6 ? "bg-emerald-500 text-white" : dark ? "bg-white/10 text-white/70" : "bg-kx-surface2 text-kx-muted"
                    }`}
                  >
                    {i >= 6 ? "Confirmed" : "Confirm"}
                  </span>
                  <span
                    className={`flex-1 text-center font-mono text-[10px] py-1.5 rounded ${
                      dark ? "bg-white/5 text-white/40" : "bg-kx-surface2/60 text-kx-muted"
                    }`}
                  >
                    Override
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Pane>

        {/* ── analytics ── */}
        <Pane show={scene === "analytics"}>
          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {[
                { v: "24m", l: "Median time-to-read" },
                { v: "98.9%", l: "Ensemble agreement" },
                { v: "100%", l: "Reads radiologist-signed" },
              ].map((s) => (
                <div key={s.l} className={`rounded-lg border ${panel} px-3 py-2.5`}>
                  <p className={`font-mono text-[19px] ${ink}`}>{s.v}</p>
                  <p className={`text-[10px] leading-tight mt-0.5 ${sub}`}>{s.l}</p>
                </div>
              ))}
            </div>

            <div className={`rounded-lg border ${panel} p-3`}>
              <div className="flex items-center justify-between mb-3">
                <p className={`font-mono text-[9px] uppercase tracking-[0.15em] ${sub}`}>
                  Minutes to first read · critical studies
                </p>
                <div className="flex items-center gap-3">
                  <Legend color={dark ? "bg-white/25" : "bg-kx-muted/35"} label="FIFO" cls={sub} />
                  <Legend color="bg-kx-accent3" label="Kroix" cls={sub} />
                </div>
              </div>
              <div className="flex items-end gap-3 h-[112px]">
                {TURNAROUND.map((d, k) => (
                  <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex items-end justify-center gap-1 h-full">
                      <Bar pct={d.fifo} on={scene === "analytics"} delay={k * 70} cls={dark ? "bg-white/20" : "bg-kx-muted/30"} />
                      <Bar pct={d.kroix} on={scene === "analytics"} delay={k * 70 + 120} cls="bg-kx-accent3" />
                    </div>
                    <span className={`font-mono text-[9px] ${sub}`}>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Pane>

        {/* cursor */}
        {step.cursor && !reduced.current && (
          <div
            className="absolute pointer-events-none z-20 transition-all duration-[600ms] ease-out"
            style={{ left: `${step.cursor.x}%`, top: `${step.cursor.y}%` }}
          >
            {step.click && (
              <span className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-kx-accent2/30 animate-ping" />
            )}
            <svg width="17" height="21" viewBox="0 0 17 21" fill="none" className="relative drop-shadow-md">
              <path d="M1 1L1 16.5L5 12.8L7.8 19L10.6 17.8L7.9 11.8L13 11.5L1 1Z" fill="white" stroke="#12151A" strokeWidth="1.2" />
            </svg>
          </div>
        )}
      </div>

      {/* caption bar */}
      <div className={`px-4 py-2.5 border-t flex items-center gap-2.5 ${chrome}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-kx-accent3 flex-shrink-0" />
        <span className={`text-[11px] ${sub}`}>{step.caption}</span>
        <span className="ml-auto flex gap-1 flex-shrink-0">
          {TABS.map((t) => (
            <span
              key={t.key}
              className={`h-0.5 rounded-full transition-all duration-500 ${
                scene === t.key ? "w-5 bg-kx-accent3" : dark ? "w-2 bg-white/20" : "w-2 bg-kx-muted/30"
              }`}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

function Pane({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div
      className="absolute inset-0 transition-all duration-500 ease-out"
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(8px)",
        pointerEvents: show ? "auto" : "none",
      }}
      aria-hidden={!show}
    >
      {children}
    </div>
  );
}

function Bar({ pct, on, delay, cls }: { pct: number; on: boolean; delay: number; cls: string }) {
  return (
    <div
      className={`w-full max-w-[13px] rounded-t-sm transition-[height] duration-[800ms] ease-out ${cls}`}
      style={{ height: on ? `${pct}%` : "0%", transitionDelay: `${delay}ms` }}
    />
  );
}

function Legend({ color, label, cls }: { color: string; label: string; cls: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-sm ${color}`} />
      <span className={`font-mono text-[9px] ${cls}`}>{label}</span>
    </span>
  );
}
