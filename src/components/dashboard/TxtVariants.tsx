import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * T-series — the inner app as plain text, on the landing page's own palette.
 *
 * THE BRIEF, as given: light, aligned with the landing page's colour scheme,
 * the best UX for a radiologist, interactive, not overwhelming, and it should
 * look like a .txt file.
 *
 * Those pull against each other, and the resolution is the same in all five:
 * the .txt quality comes from REMOVING things — no cards, no radius, no
 * shadows, no icons, monospace throughout, fixed columns, hairline rules — and
 * "not overwhelming" is solved by progressive disclosure rather than by showing
 * less. The queue stays one line per study; detail exists only for the study
 * you asked about.
 *
 * PALETTE. Landing tokens only, no new colours. `kx-canvas` ground, `kx-ink`
 * text, `kx-muted` secondary, `kx-accent2` for selection and focus.
 *
 * The contrast constraint is load-bearing and shapes every variant:
 *   kx-critical  #E8503A  3.72:1 on white  → FILL ONLY, never text
 *   kx-accent3   #0F9D6E  3.46:1 on white  → FILL ONLY, never text
 *   kx-critical-ink #B03A28  6.03:1        → the only red that may be text
 *   kx-warn      #B45309  5.02:1           → amber text
 *   kx-muted     #6B7280  4.83:1 on white, but 4.30:1 on the kx-tint2
 *                                            selection tint — so a selected row
 *                                            goes to full ink, which is also
 *                                            what selection ought to do.
 * All computed, not eyeballed. This repo has shipped a failing contrast pair
 * twice by judging it by eye.
 *
 * COLOUR BUDGET. Two appearances, everywhere: the severity rule, and the
 * waiting figure once a study is actually late. A list where every row is
 * coloured tells a radiologist nothing.
 *
 * SAMPLE DATA ONLY. Every study below is invented, and deliberately bimodal —
 * the ensemble is a binary classifier, so its scores pile up at both ends
 * rather than smearing through the middle. This file is imported by a DEV-gated
 * gallery route and must never render in production or touch real studies.
 */

export interface Study {
  id: string;
  patient: string;
  age: string;
  mod: "CR" | "DX";
  received: string;
  waited: number;               // minutes since arrival
  target: number;               // read-time target in minutes; 0 = unscored
  score: number | null;         // 0–1
  band: "CRITICAL" | "REVIEW" | "CLEAR" | null;
  finding: string;
}

export const STUDIES: Study[] = [
  { id: "688.991", patient: "0c33a8", age: "64M", mod: "DX", received: "10:54", waited: 208, target: 240,  score: 0.91, band: "REVIEW",   finding: "Cardiomegaly with vascular congestion" },
  { id: "688.985", patient: "e4407f", age: "71M", mod: "CR", received: "11:12", waited: 182, target: 240,  score: 0.88, band: "REVIEW",   finding: "Interstitial prominence, bibasilar" },
  { id: "688.982", patient: "7b2e40", age: "58F", mod: "CR", received: "13:47", waited: 27,  target: 30,   score: 0.97, band: "CRITICAL", finding: "Large pleural effusion, left" },
  { id: "688.984", patient: "19aa73", age: "45F", mod: "CR", received: "11:58", waited: 136, target: 240,  score: 0.93, band: "REVIEW",   finding: "Small effusion, blunted costophrenic angle" },
  { id: "688.983", patient: "c81d55", age: "33M", mod: "DX", received: "12:31", waited: 103, target: 240,  score: 0.96, band: "REVIEW",   finding: "Patchy opacity, left base" },
  { id: "688.981", patient: "a3f9c1", age: "29M", mod: "CR", received: "14:02", waited: 12,  target: 30,   score: 0.99, band: "CRITICAL", finding: "Pneumothorax, right apical" },
  { id: "688.992", patient: "d71f06", age: "77F", mod: "CR", received: "14:05", waited: 9,   target: 30,   score: 0.98, band: "CRITICAL", finding: "Dense consolidation, right middle lobe" },
  { id: "688.993", patient: "4e8b12", age: "52M", mod: "DX", received: "13:13", waited: 61,  target: 240,  score: 0.90, band: "REVIEW",   finding: "Hilar fullness, indeterminate" },
  { id: "688.987", patient: "b6c014", age: "24M", mod: "CR", received: "10:15", waited: 239, target: 1440, score: 0.02, band: "CLEAR",    finding: "Clear lungs" },
  { id: "688.986", patient: "5d9b28", age: "38F", mod: "DX", received: "10:40", waited: 214, target: 1440, score: 0.04, band: "CLEAR",    finding: "No acute cardiopulmonary process" },
  { id: "688.994", patient: "9a0e77", age: "41F", mod: "CR", received: "11:04", waited: 190, target: 1440, score: 0.03, band: "CLEAR",    finding: "Normal chest radiograph" },
  { id: "688.995", patient: "2f6d31", age: "66M", mod: "DX", received: "11:40", waited: 154, target: 1440, score: 0.06, band: "CLEAR",    finding: "Stable postoperative changes" },
  { id: "688.988", patient: "f20e91", age: "55M", mod: "CR", received: "14:11", waited: 3,   target: 0,    score: null, band: null,       finding: "Awaiting triage" },
];

/** Fraction of the read-time window consumed. Unscored studies have no window. */
export const consumed = (s: Study) => (s.target === 0 ? 0 : s.waited / s.target);
export const late = (s: Study) => consumed(s) >= 0.8;

export const dur = (m: number) => (m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`);
export const shortDur = (m: number) =>
  m === 0 ? "—" : m < 60 ? `${m}m` : m < 1440 ? `${m / 60}h` : `${m / 1440}d`;

/** The single ordering rule, shared by all five: closest to breaching first. */
export const ORDERED = [...STUDIES].sort((a, b) => {
  if (a.score === null) return 1;
  if (b.score === null) return -1;
  return consumed(b) - consumed(a);
});

/** Severity as a FILL. None of these three may become text — see the header. */
const RULE: Record<string, string> = {
  CRITICAL: "bg-kx-critical",
  REVIEW: "bg-kx-warn",
  CLEAR: "bg-kx-accent3",
};

const BAND_WORD: Record<string, string> = {
  CRITICAL: "critical",
  REVIEW: "review",
  CLEAR: "clear",
};

/** Every variant carries it. Sample data must never read as real. */
export function SampleNote({ className = "" }: { className?: string }) {
  return (
    <span className={cn("font-mono text-[10.5px] text-kx-muted", className)}>
      sample rows · not patient data
    </span>
  );
}

function KeyHints({ hints }: { hints: [string, string][] }) {
  return (
    <div className="flex items-center gap-4">
      {hints.map(([k, act]) => (
        <span key={act} className="flex items-center gap-1.5">
          <kbd className="font-mono text-[10.5px] text-kx-ink border border-kx-ink/20 px-1.5 py-px">{k}</kbd>
          <span className="font-mono text-[11px] text-kx-muted">{act}</span>
        </span>
      ))}
    </div>
  );
}

/** The elapsed-vs-target bar, shared. Neutral until the study is actually late. */
function TargetBar({ s, className = "" }: { s: Study; className?: string }) {
  const pct = Math.min(100, consumed(s) * 100);
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="flex-1 h-0.5 bg-kx-ink/10 relative overflow-hidden">
        <span
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-label={`${Math.round(pct)}% of read-time target elapsed`}
          className={cn("absolute inset-y-0 left-0", late(s) ? "bg-kx-critical" : "bg-kx-ink/25")}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="font-mono text-[10.5px] text-kx-muted w-6 text-right">{shortDur(s.target)}</span>
    </span>
  );
}

const HEADS: [string, string][] = [
  ["study", "text-left"], ["patient", "text-left"], ["age", "text-left"], ["mod", "text-left"],
  ["finding", "text-left"], ["waiting", "text-right"], ["target", "text-left"], ["score", "text-right"],
];

const GRID = "grid grid-cols-[3px_14px_62px_58px_36px_28px_minmax(0,1fr)_74px_104px_34px] gap-x-3 items-center";

/* ══════════════════════════════════════════════════════════════════════════
   T1 — Plaintext
   The purest reading of the brief. Fixed columns, one hairline under the
   header, click a row to expand it in place. Nothing navigates.
   ══════════════════════════════════════════════════════════════════════════ */
export function TxtPlaintext() {
  const [open, setOpen] = useState(0);

  return (
    <div className="bg-kx-canvas px-10 py-7 font-mono text-kx-ink">
      <div className="flex items-baseline gap-3.5">
        <span className="text-[13px] font-semibold">kroix/worklist</span>
        <span className="text-[12px] text-kx-muted">38 studies</span>
        <span className="text-[12px] text-kx-muted">·</span>
        <span className="text-[12px] text-kx-critical-ink">3 over target</span>
        <span className="flex-1" />
        <span className="text-[12px] text-kx-muted">sorted by time to target</span>
      </div>

      <div className={cn(GRID, "border-b border-kx-ink pb-1.5 mt-5")}>
        <span /><span />
        {HEADS.map(([h, align]) => (
          <span key={h} className={cn("text-[10.5px] tracking-[0.05em] text-kx-muted", align)}>{h}</span>
        ))}
      </div>

      {ORDERED.map((s, i) => {
        const isOpen = i === open;
        return (
          <div key={s.id}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              className={cn(
                GRID, "w-full h-[34px] text-left border-b border-kx-ink/[0.06]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-kx-accent2 focus-visible:ring-inset",
                isOpen ? "bg-kx-tint2" : "hover:bg-kx-surface/70",
              )}
            >
              <span className={cn("w-[3px] h-[17px]", s.band ? RULE[s.band] : "bg-transparent")} />
              <span className="text-[11px] text-kx-accent2 text-center">{isOpen ? "▸" : ""}</span>
              <span className="text-[12px] text-kx-muted">{s.id}</span>
              <span className={cn("text-[12px]", s.band ? "text-kx-ink" : "text-kx-muted")}>{s.patient}</span>
              <span className="text-[12px] text-kx-muted">{s.age}</span>
              <span className="text-[12px] text-kx-muted">{s.mod}</span>
              <span className={cn("text-[12.5px] truncate", s.band ? "text-kx-ink" : "text-kx-muted")}>{s.finding}</span>
              <span className={cn("text-[12px] text-right tabular-nums", late(s) ? "text-kx-critical-ink" : "text-kx-muted")}>{dur(s.waited)}</span>
              <TargetBar s={s} />
              <span className={cn("text-[12px] text-right tabular-nums", s.band ? "text-kx-ink" : "text-kx-muted")}>
                {s.score === null ? "—" : s.score.toFixed(2)}
              </span>
            </button>

            {isOpen && (
              <div className="bg-kx-surface border-l-[3px] border-kx-accent2 pl-[70px] pr-4 py-3.5 flex items-start gap-12">
                <div className="flex-1 min-w-0">
                  {[
                    ["band", s.band ? `${BAND_WORD[s.band]} · target ${shortDur(s.target)}` : "unscored", false],
                    ["waiting", `${dur(s.waited)} of ${shortDur(s.target)}${late(s) ? "  — over target" : ""}`, late(s)],
                    ["model", "ensemble · densenet121 + googlenet + resnet18", false],
                    ["localization", "none for this study", false],
                    ["labs", "simulated from risk score — not a blood draw", false],
                  ].map(([k, v, warn]) => (
                    <div key={k as string} className="flex gap-2.5 py-0.5">
                      <span className="text-[11.5px] text-kx-muted w-24 shrink-0">{k as string}</span>
                      <span className={cn("text-[11.5px]", warn ? "text-kx-critical-ink" : "text-kx-ink")}>{v as string}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" className="text-[11.5px] bg-kx-ink text-white px-4 py-2">open →</button>
                  <button type="button" className="text-[11.5px] border border-kx-ink/20 px-4 py-2">defer</button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="border-t border-kx-border pt-3 mt-3 flex items-center">
        <KeyHints hints={[["j k", "move"], ["↵", "expand"], ["o", "open"], ["esc", "collapse"]]} />
        <span className="flex-1" />
        <SampleNote />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   T2 — Ledger
   The same data ruled like a spreadsheet: visible column dividers, a footer
   that totals the queue, sortable headers. Denser than T1 and more scannable
   down a column, at the cost of more lines on screen.
   ══════════════════════════════════════════════════════════════════════════ */
export function TxtLedger() {
  const [sort, setSort] = useState<"target" | "score" | "waited">("target");

  const rows = useMemo(() => {
    const r = [...STUDIES];
    if (sort === "score") return r.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    if (sort === "waited") return r.sort((a, b) => b.waited - a.waited);
    return r.sort((a, b) => (a.score === null ? 1 : b.score === null ? -1 : consumed(b) - consumed(a)));
  }, [sort]);

  const cell = "px-3 py-[7px] border-r border-kx-ink/[0.07] last:border-r-0";

  return (
    <div className="bg-kx-canvas px-10 py-7 font-mono text-kx-ink">
      <div className="flex items-baseline gap-3.5 mb-4">
        <span className="text-[13px] font-semibold">kroix/worklist.tsv</span>
        <span className="text-[12px] text-kx-muted">13 rows</span>
        <span className="flex-1" />
        <span className="text-[11.5px] text-kx-muted">sort</span>
        {(["target", "waited", "score"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setSort(k)}
            className={cn("text-[11.5px] px-2 py-0.5", sort === k ? "text-kx-ink border-b border-kx-accent2" : "text-kx-muted")}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="border border-kx-ink/15">
        <div className="grid grid-cols-[3px_70px_64px_40px_32px_minmax(0,1fr)_78px_60px_52px] bg-kx-surface2 border-b border-kx-ink/15">
          <span />
          {["study", "patient", "age", "mod", "finding", "waiting", "target", "score"].map((h, i) => (
            <span key={h} className={cn(cell, "text-[10.5px] tracking-[0.05em] text-kx-muted", i >= 5 && "text-right")}>{h}</span>
          ))}
        </div>

        {rows.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              "grid grid-cols-[3px_70px_64px_40px_32px_minmax(0,1fr)_78px_60px_52px] border-b border-kx-ink/[0.07] last:border-b-0",
              i % 2 === 1 && "bg-kx-surface/45",
            )}
          >
            <span className={cn(s.band ? RULE[s.band] : "bg-transparent")} />
            <span className={cn(cell, "text-[11.5px] text-kx-muted")}>{s.id}</span>
            <span className={cn(cell, "text-[11.5px]")}>{s.patient}</span>
            <span className={cn(cell, "text-[11.5px] text-kx-muted")}>{s.age}</span>
            <span className={cn(cell, "text-[11.5px] text-kx-muted")}>{s.mod}</span>
            <span className={cn(cell, "text-[12px] truncate", s.band ? "text-kx-ink" : "text-kx-muted")}>{s.finding}</span>
            <span className={cn(cell, "text-[11.5px] text-right tabular-nums", late(s) ? "text-kx-critical-ink" : "text-kx-muted")}>{dur(s.waited)}</span>
            <span className={cn(cell, "text-[11.5px] text-right tabular-nums text-kx-muted")}>{shortDur(s.target)}</span>
            <span className={cn(cell, "text-[11.5px] text-right tabular-nums")}>{s.score === null ? "—" : s.score.toFixed(2)}</span>
          </div>
        ))}

        <div className="grid grid-cols-[3px_70px_64px_40px_32px_minmax(0,1fr)_78px_60px_52px] bg-kx-surface2 border-t border-kx-ink/15">
          <span />
          <span className={cn(cell, "text-[11px] text-kx-muted")}>total</span>
          <span className={cn(cell, "text-[11px] text-kx-muted")}>13</span>
          <span className={cn(cell)} />
          <span className={cn(cell)} />
          <span className={cn(cell, "text-[11px] text-kx-muted")}>3 critical · 5 review · 4 clear · 1 unscored</span>
          <span className={cn(cell, "text-[11px] text-right text-kx-critical-ink")}>3 late</span>
          <span className={cn(cell)} />
          <span className={cn(cell, "text-[11px] text-right tabular-nums text-kx-muted")}>0.58</span>
        </div>
      </div>

      <div className="flex items-center mt-3">
        <span className="font-mono text-[11px] text-kx-muted">mean score is not a quality metric — the distribution is bimodal</span>
        <span className="flex-1" />
        <SampleNote />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   T3 — Split
   The queue never leaves the screen. A narrow text column on the left, the
   selected study permanently open on the right. Closest to how a PACS worklist
   actually behaves, and the only variant where opening a study costs nothing.
   ══════════════════════════════════════════════════════════════════════════ */
export function TxtSplit() {
  const [sel, setSel] = useState(0);
  const s = ORDERED[sel];

  return (
    <div className="bg-kx-canvas font-mono text-kx-ink grid grid-cols-[400px_minmax(0,1fr)] min-h-[620px]">
      <div className="border-r border-kx-border flex flex-col">
        <div className="px-6 pt-7 pb-3 flex items-baseline gap-3">
          <span className="text-[13px] font-semibold">worklist</span>
          <span className="text-[11.5px] text-kx-muted">13</span>
          <span className="flex-1" />
          <span className="text-[11.5px] text-kx-critical-ink">3 late</span>
        </div>
        <div className="flex-1 overflow-hidden">
          {ORDERED.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSel(i)}
              aria-current={i === sel ? "true" : undefined}
              className={cn(
                "w-full text-left grid grid-cols-[3px_minmax(0,1fr)_56px] gap-x-3 items-center h-[46px] px-6 border-b border-kx-ink/[0.06]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-kx-accent2 focus-visible:ring-inset",
                i === sel ? "bg-kx-tint2" : "hover:bg-kx-surface/70",
              )}
            >
              <span className={cn("w-[3px] h-[26px]", r.band ? RULE[r.band] : "bg-transparent")} />
              <span className="min-w-0">
                <span className={cn("block text-[12.5px] truncate", r.band ? "text-kx-ink" : "text-kx-muted")}>{r.finding}</span>
                <span className="block text-[10.5px] text-kx-muted mt-0.5">{r.patient} · {r.age} · {r.mod}</span>
              </span>
              <span className={cn("text-[11.5px] text-right tabular-nums", late(r) ? "text-kx-critical-ink" : "text-kx-muted")}>{dur(r.waited)}</span>
            </button>
          ))}
        </div>
        <div className="px-6 py-3 border-t border-kx-border">
          <SampleNote />
        </div>
      </div>

      <div className="px-10 py-7 flex flex-col">
        <span className="text-[11.5px] text-kx-muted">study {s.id} · patient {s.patient} · {s.age} · {s.mod} · received {s.received}</span>
        <h3 className="font-display text-[26px] font-medium tracking-[-0.01em] mt-2.5 leading-tight">{s.finding}</h3>

        <div className="flex items-baseline gap-4 mt-5">
          <span className="text-[30px] tabular-nums font-medium">{s.score === null ? "—" : s.score.toFixed(2)}</span>
          <span className="text-[12px] text-kx-muted">{s.band ? `${BAND_WORD[s.band]} band` : "unscored"}</span>
          <span className="flex-1" />
          <span className={cn("text-[12px]", late(s) ? "text-kx-critical-ink" : "text-kx-muted")}>
            {dur(s.waited)} of {shortDur(s.target)} target
          </span>
        </div>
        <TargetBar s={s} className="mt-2.5" />

        <div className="mt-6 border-t border-kx-border pt-4">
          {[
            ["model", "ensemble · densenet121 + googlenet + resnet18", false],
            ["fusion", "tanh-weighted · 0.333 / 0.333 / 0.333", false],
            ["cv accuracy", "97.7% · 5-fold", false],
            ["cohort", "Kermany 2018 · public, pediatric, single-centre, binary", true],
            ["localization", "none for this study", true],
            ["labs", "simulated from risk score — not a blood draw", true],
          ].map(([k, v, muted]) => (
            <div key={k as string} className="flex gap-3 py-1">
              <span className="text-[11.5px] text-kx-muted w-28 shrink-0">{k as string}</span>
              <span className={cn("text-[11.5px]", muted ? "text-kx-muted" : "text-kx-ink")}>{v as string}</span>
            </div>
          ))}
        </div>

        <span className="flex-1" />
        <div className="flex gap-2 border-t border-kx-border pt-4">
          <button type="button" className="text-[11.5px] bg-kx-ink text-white px-5 py-2.5">open in reviewer →</button>
          <button type="button" className="text-[11.5px] border border-kx-ink/20 px-5 py-2.5">defer</button>
          <span className="flex-1" />
          <KeyHints hints={[["j k", "move"], ["o", "open"]]} />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   T4 — Timeline
   Position carries the meaning: every study sits on a single axis running from
   "just arrived" to "target missed". The shape of the queue is legible without
   reading a single number — which is the one thing a sorted list cannot do.
   ══════════════════════════════════════════════════════════════════════════ */
export function TxtTimeline() {
  const [sel, setSel] = useState<string | null>(ORDERED[0].id);
  const scored = ORDERED.filter((s) => s.score !== null);
  const unscored = ORDERED.filter((s) => s.score === null);

  return (
    <div className="bg-kx-canvas px-10 py-7 font-mono text-kx-ink">
      <div className="flex items-baseline gap-3.5">
        <span className="text-[13px] font-semibold">kroix/timeline</span>
        <span className="text-[12px] text-kx-muted">by proportion of read-time target consumed</span>
        <span className="flex-1" />
        <span className="text-[12px] text-kx-critical-ink">3 over target</span>
      </div>

      <div className="mt-7 relative">
        <div className="flex justify-between border-b border-kx-ink pb-1.5">
          {["arrived", "25%", "50%", "75%", "target"].map((t) => (
            <span key={t} className="text-[10.5px] text-kx-muted">{t}</span>
          ))}
        </div>
        {/* The 80% threshold: where a study starts being at risk of the miss. */}
        <div className="absolute top-6 bottom-0 border-l border-dashed border-kx-critical/40" style={{ left: "80%" }}>
          <span className="absolute -top-[22px] -left-6 text-[10px] text-kx-critical-ink">80%</span>
        </div>

        <div className="pt-3">
          {scored.map((s) => {
            const pct = Math.min(100, consumed(s) * 100);
            const on = sel === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSel(on ? null : s.id)}
                aria-current={on ? "true" : undefined}
                className={cn(
                  "w-full h-[38px] relative text-left border-b border-kx-ink/[0.06] block",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-kx-accent2 focus-visible:ring-inset",
                  on ? "bg-kx-tint2" : "hover:bg-kx-surface/70",
                )}
              >
                <span
                  className={cn("absolute top-0 bottom-0 left-0", late(s) ? "bg-kx-critical/[0.07]" : "bg-kx-ink/[0.035]")}
                  style={{ width: `${pct}%` }}
                />
                <span className={cn("absolute top-1.5 bottom-1.5 w-[3px]", s.band ? RULE[s.band] : "bg-transparent")} style={{ left: `calc(${pct}% - 1.5px)` }} />
                <span className="relative flex items-center h-full gap-3 px-3">
                  <span className="text-[11.5px] text-kx-muted w-[58px]">{s.patient}</span>
                  <span className="text-[12.5px] truncate flex-1">{s.finding}</span>
                  <span className={cn("text-[11.5px] tabular-nums", late(s) ? "text-kx-critical-ink" : "text-kx-muted")}>
                    {dur(s.waited)} / {shortDur(s.target)}
                  </span>
                  <span className="text-[11.5px] tabular-nums w-10 text-right">{s.score?.toFixed(2)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {unscored.length > 0 && (
        <div className="mt-5 border-t border-dashed border-kx-border pt-3">
          <span className="text-[10.5px] tracking-[0.05em] text-kx-muted">no target — not scored by any model</span>
          {unscored.map((s) => (
            <div key={s.id} className="flex items-center gap-3 h-[34px] px-3">
              <span className="text-[11.5px] text-kx-muted w-[58px]">{s.patient}</span>
              <span className="text-[12.5px] text-kx-muted flex-1">{s.finding}</span>
              <span className="text-[11.5px] text-kx-muted">waiting {dur(s.waited)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-kx-border pt-3 mt-4 flex items-center">
        <span className="font-mono text-[11px] text-kx-muted">position is time consumed, not severity — a 0.99 that just arrived sits left of a 0.88 that has waited three hours</span>
        <span className="flex-1" />
        <SampleNote />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   T5 — Command
   Keyboard first. The list is a result set, not a dashboard: everything is
   reachable by typing, and the chrome is one line. The least discoverable of
   the five and the fastest once learned — which is the right trade for a
   surface someone sits in for eight hours.
   ══════════════════════════════════════════════════════════════════════════ */
export function TxtCommand() {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return ORDERED;
    return ORDERED.filter((s) =>
      [s.patient, s.id, s.finding, s.band ?? "unscored", s.mod].join(" ").toLowerCase().includes(needle),
    );
  }, [q]);

  return (
    <div className="bg-kx-canvas px-10 py-7 font-mono text-kx-ink">
      <div className="border border-kx-ink/15 flex items-center gap-3 px-4 py-2.5">
        <span className="text-[13px] text-kx-accent2">›</span>
        <label htmlFor="txt-command-q" className="sr-only">Filter the worklist</label>
        <input
          id="txt-command-q"
          value={q}
          onChange={(e) => { setQ(e.target.value); setSel(0); }}
          placeholder="filter by patient, finding, band…"
          className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-kx-muted"
        />
        <span className="text-[11px] text-kx-muted">{rows.length} of {ORDERED.length}</span>
        <kbd className="font-mono text-[10.5px] text-kx-muted border border-kx-ink/20 px-1.5 py-px">⌘K</kbd>
      </div>

      <div className="flex gap-2 mt-3">
        {["over target", "critical", "unscored", "CR", "DX"].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => { setQ(f === "over target" ? "" : f); setSel(0); }}
            className="text-[11px] text-kx-muted border border-kx-border px-2.5 py-1 hover:text-kx-ink hover:border-kx-ink/25"
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {rows.length === 0 ? (
          <p className="text-[12.5px] text-kx-muted py-8">no studies match “{q}”</p>
        ) : (
          rows.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSel(i)}
              aria-current={i === sel ? "true" : undefined}
              className={cn(
                "w-full text-left grid grid-cols-[3px_14px_minmax(0,1fr)_86px_68px_44px] gap-x-3 items-center h-[36px] px-2",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-kx-accent2 focus-visible:ring-inset",
                i === sel ? "bg-kx-tint2" : "hover:bg-kx-surface/70",
              )}
            >
              <span className={cn("w-[3px] h-[18px]", s.band ? RULE[s.band] : "bg-transparent")} />
              <span className="text-[11px] text-kx-accent2 text-center">{i === sel ? "▸" : ""}</span>
              <span className="flex items-baseline gap-2.5 min-w-0">
                <span className={cn("text-[12.5px] truncate", s.band ? "text-kx-ink" : "text-kx-muted")}>{s.finding}</span>
                <span className="text-[10.5px] text-kx-muted shrink-0">{s.patient} · {s.age}</span>
              </span>
              <span className="text-[11px] text-kx-muted">{s.band ? BAND_WORD[s.band] : "unscored"}</span>
              <span className={cn("text-[11.5px] text-right tabular-nums", late(s) ? "text-kx-critical-ink" : "text-kx-muted")}>{dur(s.waited)}</span>
              <span className="text-[11.5px] text-right tabular-nums">{s.score === null ? "—" : s.score.toFixed(2)}</span>
            </button>
          ))
        )}
      </div>

      <div className="border-t border-kx-border pt-3 mt-4 flex items-center">
        <KeyHints hints={[["↑ ↓", "move"], ["↵", "open"], ["/", "filter"], ["esc", "clear"]]} />
        <span className="flex-1" />
        <SampleNote />
      </div>
    </div>
  );
}
