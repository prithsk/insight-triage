import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Activity, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RiskBucket } from "@/lib/types";

/**
 * Five worklist layouts, one dataset.
 *
 * The current worklist renders cards with hover-lift, ring, and coloured shadow,
 * under a 48px "Triage Command Center" headline and three stacked
 * `bg-white/40 backdrop-blur-sm` bars. That is landing-page chrome on a tool a
 * radiologist would sit in for eight hours — the "vibe-coded" feel the user is
 * reacting to. Real reading-room software is dense, tabular, monospace for
 * identifiers, and spends colour only on severity.
 *
 * Each variant below changes the LAYOUT, not the data. Comparing them should
 * isolate the design decision.
 *
 * SAMPLE DATA ONLY. These rows are invented. This file is imported by a
 * DEV-gated gallery route and must never be rendered in production or wired to
 * real studies — a fabricated worklist that looks real is exactly the failure
 * class this repo keeps finding.
 */

export interface Row {
  id: string;
  patient: string;
  received: string;
  waited: number;      // minutes since arrival
  target: number;      // read-time target in minutes for this band
  modality: string;
  score: number | null;
  bucket: RiskBucket | null;
  finding: string;
  status: "new" | "opened" | "read";
}

/**
 * Scores are BIMODAL, and that is the point.
 *
 * The ensemble is a binary abnormal-vs-normal classifier reporting 98.9% on
 * 5-fold CV. A classifier that discriminates that well does not emit a smear of
 * values through the middle — its outputs pile up at both ends, because it is
 * rarely unsure. An earlier version of this sample had 0.64 / 0.58 / 0.52 sitting
 * three points apart, which depicts a model that cannot separate its two classes.
 *
 * So: abnormal studies land 0.88-0.99, normal studies land 0.01-0.07, and almost
 * nothing occupies 0.10-0.85.
 *
 * THE CONSEQUENCE, which is a real product question and not a display detail:
 * the model separates abnormal from normal sharply, but it does NOT separate
 * *critical* abnormal from *moderate* abnormal — a pneumothorax and a small
 * effusion both read as "abnormal, high confidence". The severity band therefore
 * cannot come from this score alone. Whatever assigns CRITICAL vs REVIEW is a
 * second mechanism, and the medium-band ordering Kroix claims to improve lives
 * inside a range where this model is nearly flat.
 */
export const ROWS: Row[] = [
  { id: "1.2.840.113619.2.55.3.604688.981", patient: "a3f9c1", received: "14:02", waited: 12,  target: 30,   modality: "CR", score: 0.99, bucket: "CRITICAL", finding: "Pneumothorax, right apical",     status: "new"    },
  { id: "1.2.840.113619.2.55.3.604688.982", patient: "7b2e40", received: "13:47", waited: 27,  target: 30,   modality: "CR", score: 0.97, bucket: "CRITICAL", finding: "Large pleural effusion, left",  status: "opened" },
  { id: "1.2.840.113619.2.55.3.604688.983", patient: "c81d55", received: "12:31", waited: 103, target: 240,  modality: "DX", score: 0.96, bucket: "REVIEW",   finding: "Patchy opacity, left base",     status: "new"    },
  { id: "1.2.840.113619.2.55.3.604688.984", patient: "19aa73", received: "11:58", waited: 136, target: 240,  modality: "CR", score: 0.93, bucket: "REVIEW",   finding: "Small effusion, blunted CPA",   status: "new"    },
  { id: "1.2.840.113619.2.55.3.604688.985", patient: "e4407f", received: "11:12", waited: 182, target: 240,  modality: "CR", score: 0.88, bucket: "REVIEW",   finding: "Interstitial prominence",       status: "opened" },
  { id: "1.2.840.113619.2.55.3.604688.986", patient: "5d9b28", received: "10:40", waited: 214, target: 1440, modality: "DX", score: 0.04, bucket: "CLEAR",    finding: "No acute cardiopulmonary process", status: "read" },
  { id: "1.2.840.113619.2.55.3.604688.987", patient: "b6c014", received: "10:15", waited: 239, target: 1440, modality: "CR", score: 0.02, bucket: "CLEAR",    finding: "Clear lungs",                   status: "read"   },
  { id: "1.2.840.113619.2.55.3.604688.988", patient: "f20e91", received: "14:11", waited: 3,   target: 30,   modality: "CR", score: null, bucket: null,       finding: "—",                             status: "new"    },
];

export const BUCKET = {
  CRITICAL: { label: "Critical", hex: "#E8503A", icon: AlertTriangle },
  REVIEW:   { label: "Review",   hex: "#F5B301", icon: Activity      },
  CLEAR:    { label: "Clear",    hex: "#0F9D6E", icon: CheckCircle2  },
} as const;

export const shortId = (id: string) => id.slice(-6);
export const pct = (r: Row) => Math.min(100, (r.waited / r.target) * 100);
export const breaching = (r: Row) => r.waited / r.target > 0.8;

export function elapsed(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m`;
}

/** Shared caption. Every variant carries it — sample data must never read as real. */
function SampleNote() {
  return (
    <p className="font-mono text-[10.5px] text-kx-muted/70 mt-3">
      Sample rows. Not patient data.
    </p>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   W1 — Ledger
   RunInfra's baseline/optimized/delta table: hairline rows, tabular numerals,
   severity as a 2px left rule rather than a badge. Maximum rows per screen.
   ══════════════════════════════════════════════════════════════════════════ */
export function WorklistLedger() {
  const [sel, setSel] = useState<string | null>(ROWS[0].id);

  return (
    <div className="bg-kx-canvas p-8">
      <div className="flex items-baseline justify-between mb-5">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-[19px] text-kx-ink tracking-[-0.01em]">Worklist</h2>
          <span className="font-mono text-[12px] text-kx-muted">{ROWS.length} studies · 2 critical</span>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-wider text-kx-muted">
          sorted by score
        </span>
      </div>

      <div className="border border-kx-border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-kx-border bg-kx-surface">
              {["", "Study", "Patient", "Recv", "Waited", "Mod", "Finding", "Score"].map((h, i) => (
                <th
                  key={i}
                  className={cn(
                    "font-mono text-[10.5px] uppercase tracking-wider text-kx-muted font-medium py-2.5",
                    i === 0 ? "w-1 p-0" : "px-3",
                    h === "Score" && "text-right"
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const b = r.bucket ? BUCKET[r.bucket] : null;
              return (
                <tr
                  key={r.id}
                  onClick={() => setSel(r.id)}
                  className={cn(
                    "border-b border-kx-border/60 last:border-0 cursor-pointer transition-colors",
                    sel === r.id ? "bg-kx-surface" : "hover:bg-kx-surface/50"
                  )}
                >
                  <td className="p-0 w-1">
                    <div className="w-[3px] h-9" style={{ background: b?.hex ?? "transparent" }} />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12.5px] text-kx-ink">…{shortId(r.id)}</td>
                  <td className="px-3 py-2.5 font-mono text-[12.5px] text-kx-muted">{r.patient}</td>
                  <td className="px-3 py-2.5 font-mono text-[12.5px] text-kx-muted tabular-nums">{r.received}</td>
                  <td className={cn(
                    "px-3 py-2.5 font-mono text-[12.5px] tabular-nums",
                    breaching(r) ? "text-kx-critical" : "text-kx-muted"
                  )}>
                    {elapsed(r.waited)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-kx-muted">{r.modality}</td>
                  <td className="px-3 py-2.5 text-[13px] text-kx-ink truncate max-w-[280px]">{r.finding}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="font-mono text-[13px] tabular-nums" style={{ color: b?.hex ?? "#6B7280" }}>
                      {r.score?.toFixed(2) ?? "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <SampleNote />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   W2 — Rail + Reader
   herdr's left rail of named items beside a working pane. The queue never
   leaves the screen, so reading one study does not mean navigating away from
   the list. Closest to how PACS worklists actually behave.
   ══════════════════════════════════════════════════════════════════════════ */
export function WorklistRail() {
  const [sel, setSel] = useState(ROWS[0]);

  return (
    <div className="bg-kx-surface p-8">
      <div className="grid grid-cols-[300px_1fr] gap-0 border border-kx-border rounded-lg overflow-hidden bg-white h-[520px]">
        {/* Rail */}
        <div className="border-r border-kx-border flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-kx-border flex items-center justify-between flex-shrink-0">
            <span className="font-mono text-[11px] uppercase tracking-wider text-kx-muted">queue</span>
            <span className="font-mono text-[11px] text-kx-critical">2 critical</span>
          </div>
          <ul className="overflow-y-auto flex-1">
            {ROWS.map((r) => {
              const b = r.bucket ? BUCKET[r.bucket] : null;
              const active = sel.id === r.id;
              return (
                <li key={r.id}>
                  <button
                    onClick={() => setSel(r)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-kx-border/50 flex items-start gap-2.5 transition-colors",
                      active ? "bg-kx-surface2" : "hover:bg-kx-surface/60"
                    )}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: b?.hex ?? "#D1D5DB" }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-[12px] text-kx-ink">…{shortId(r.id)}</span>
                        <span className={cn(
                          "font-mono text-[11px] tabular-nums",
                          breaching(r) ? "text-kx-critical" : "text-kx-muted"
                        )}>{elapsed(r.waited)}</span>
                      </span>
                      <span className="block text-[12px] text-kx-muted truncate mt-0.5">{r.finding}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Reader */}
        <div className="p-6 flex flex-col min-h-0">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="font-mono text-[12px] text-kx-muted mb-1">{sel.id}</p>
              <h3 className="font-display text-[22px] text-kx-ink tracking-[-0.01em]">{sel.finding}</h3>
            </div>
            {sel.bucket && (
              <span
                className="font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 rounded"
                style={{ background: `${BUCKET[sel.bucket].hex}18`, color: BUCKET[sel.bucket].hex }}
              >
                {BUCKET[sel.bucket].label}
              </span>
            )}
          </div>

          <div className="flex-1 rounded-lg bg-kx-ink/[0.03] border border-kx-border grid place-items-center">
            <span className="font-mono text-[12px] text-kx-muted">image viewport</span>
          </div>

          <div className="grid grid-cols-4 gap-5 mt-5 pt-5 border-t border-kx-border">
            {[
              ["score", sel.score?.toFixed(2) ?? "—"],
              ["waited", elapsed(sel.waited)],
              ["target", elapsed(sel.target)],
              ["modality", sel.modality],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="font-mono text-[10.5px] uppercase tracking-wider text-kx-muted mb-1">{k}</p>
                <p className="font-mono text-[15px] text-kx-ink tabular-nums">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <SampleNote />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   W3 — Lanes
   Three severity columns. Triage becomes spatial: a glance at column height
   tells you the shape of the queue without reading a single row. The risk is
   that it hides wait time, which is the metric that actually matters.
   ══════════════════════════════════════════════════════════════════════════ */
export function WorklistLanes() {
  const lanes: RiskBucket[] = ["CRITICAL", "REVIEW", "CLEAR"];

  return (
    <div className="bg-kx-tint2 p-8">
      <div className="grid md:grid-cols-3 gap-4">
        {lanes.map((lane) => {
          const b = BUCKET[lane];
          const items = ROWS.filter((r) => r.bucket === lane);
          const Icon = b.icon;
          return (
            <div key={lane} className="rounded-lg border border-kx-border bg-white overflow-hidden">
              <div
                className="px-4 py-3 flex items-center justify-between border-b border-kx-border"
                style={{ background: `${b.hex}0E` }}
              >
                <span className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" style={{ color: b.hex }} />
                  <span className="font-mono text-[11.5px] uppercase tracking-wider" style={{ color: b.hex }}>
                    {b.label}
                  </span>
                </span>
                <span className="font-mono text-[12px] tabular-nums" style={{ color: b.hex }}>
                  {items.length}
                </span>
              </div>

              <ul className="p-2 space-y-1.5 min-h-[220px]">
                {items.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-md border border-kx-border px-3 py-2.5 cursor-pointer hover:border-kx-ink/25 transition-colors"
                  >
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="font-mono text-[12px] text-kx-ink">…{shortId(r.id)}</span>
                      <span className="font-mono text-[12px] tabular-nums" style={{ color: b.hex }}>
                        {r.score?.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-kx-muted truncate">{r.finding}</p>
                    <p className={cn(
                      "font-mono text-[11px] mt-1.5 tabular-nums",
                      breaching(r) ? "text-kx-critical" : "text-kx-muted"
                    )}>
                      waiting {elapsed(r.waited)}
                    </p>
                  </li>
                ))}
                {items.length === 0 && (
                  <li className="text-center py-8 font-mono text-[11.5px] text-kx-muted">empty</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
      <SampleNote />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   W4 — Clock
   Ordered by time remaining against the read-time target, with the bar showing
   elapsed-vs-target. This is the only variant whose primary axis is the metric
   Kroix actually claims to move, so it argues the product's thesis on screen.
   ══════════════════════════════════════════════════════════════════════════ */
export function WorklistClock() {
  const ordered = [...ROWS].sort((a, b) => pct(b) - pct(a));

  return (
    <div className="bg-kx-canvas p-8">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="font-display text-[19px] text-kx-ink tracking-[-0.01em]">
          Against read-time target
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-wider text-kx-muted">
          closest to breach first
        </span>
      </div>

      <div className="rounded-lg border border-kx-border bg-white divide-y divide-kx-border/60">
        {ordered.map((r) => {
          const b = r.bucket ? BUCKET[r.bucket] : null;
          const p = pct(r);
          const over = p >= 100;
          return (
            <div key={r.id} className="px-4 py-3.5 hover:bg-kx-surface/50 transition-colors cursor-pointer">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-mono text-[12.5px] text-kx-ink w-[70px] flex-shrink-0">
                  …{shortId(r.id)}
                </span>
                <span className="text-[13px] text-kx-ink truncate flex-1">{r.finding}</span>
                <span
                  className="font-mono text-[12.5px] tabular-nums flex-shrink-0"
                  style={{ color: b?.hex ?? "#6B7280" }}
                >
                  {r.score?.toFixed(2) ?? "—"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-kx-surface2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${Math.min(100, p)}%`,
                      background: over ? "#E8503A" : p > 80 ? "#F5B301" : b?.hex ?? "#9CA3AF",
                    }}
                  />
                </div>
                <span className={cn(
                  "font-mono text-[11.5px] tabular-nums w-[120px] text-right flex-shrink-0",
                  over ? "text-kx-critical" : "text-kx-muted"
                )}>
                  {elapsed(r.waited)} / {elapsed(r.target)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <SampleNote />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   W5 — Console
   herdr's dark terminal, taken literally: monospace throughout, keyboard hints
   on every row, no decorative colour. Reading rooms are dim, and a dark tool
   is easier on the eye across a shift — but it breaks with every other surface
   in the product, so it is the biggest commitment of the five.
   ══════════════════════════════════════════════════════════════════════════ */
export function WorklistConsole() {
  const [sel, setSel] = useState(0);

  return (
    <div className="bg-kx-ink p-8">
      <div className="rounded-lg border border-white/10 bg-black/25 overflow-hidden font-mono">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
          <span className="text-[11.5px] text-white/45">worklist — 8 studies, 2 critical</span>
          <span className="text-[11px] text-white/30">j/k move · enter open · r read</span>
        </div>

        <div className="px-2 py-1.5">
          <div className="grid grid-cols-[16px_78px_66px_1fr_74px_58px] gap-3 px-2.5 py-1.5 text-[10.5px] uppercase tracking-wider text-white/30">
            <span /><span>study</span><span>patient</span><span>finding</span><span>waited</span><span className="text-right">score</span>
          </div>

          {ROWS.map((r, i) => {
            const b = r.bucket ? BUCKET[r.bucket] : null;
            const active = i === sel;
            return (
              <button
                key={r.id}
                onClick={() => setSel(i)}
                className={cn(
                  "w-full grid grid-cols-[16px_78px_66px_1fr_74px_58px] gap-3 px-2.5 py-2 rounded text-left transition-colors",
                  active ? "bg-white/[0.07]" : "hover:bg-white/[0.035]"
                )}
              >
                <span className="text-[12px]" style={{ color: b?.hex ?? "rgba(255,255,255,0.2)" }}>
                  {active ? "›" : "•"}
                </span>
                <span className="text-[12px] text-white/80">…{shortId(r.id)}</span>
                <span className="text-[12px] text-white/40">{r.patient}</span>
                <span className="text-[12px] text-white/55 truncate">{r.finding}</span>
                <span className={cn("text-[12px] tabular-nums", breaching(r) ? "text-[#E8503A]" : "text-white/40")}>
                  {elapsed(r.waited)}
                </span>
                <span className="text-[12px] tabular-nums text-right" style={{ color: b?.hex ?? "rgba(255,255,255,0.35)" }}>
                  {r.score?.toFixed(2) ?? "—"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-4 py-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-white/35">
          <span>{ROWS[sel].id}</span>
          <span className="flex items-center gap-1.5">
            open <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
      <p className="font-mono text-[10.5px] text-white/25 mt-3">Sample rows. Not patient data.</p>
    </div>
  );
}
