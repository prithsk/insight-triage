import { useState } from "react";
import { ChevronRight, Mic, Check, X, ArrowLeftRight, Layers, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROWS, BUCKET, shortId, elapsed, breaching, type Row } from "./WorklistVariants";

/**
 * Five takes on the rail-plus-reader shape (W2).
 *
 * W2 established the constraint worth keeping: the queue stays on screen, so
 * opening a study is not a navigation. These five disagree about what belongs in
 * the pane beside it.
 *
 * References, named specifically so the variants do not converge:
 *
 *  - New Lantern (newlantern.ai) — worklist, viewer and REPORTING in one system.
 *    Their thesis is that the radiologist's deliverable is a signed report, not a
 *    score, and that context-switching between systems is the actual tax. R1.
 *  - Rivet / Forward — floating translucent cards over a working surface, and
 *    Forward's "Strengths / Diligence Points" evidence stack. R2 and R5.
 *  - herdr — tabbed panes with a grouped left rail carrying per-item state. R4.
 *  - The bento model-API page — horizontal scanning with hairline dividers. R3.
 *
 * SAMPLE DATA ONLY, shared with WorklistVariants so the layout is the sole
 * variable. DEV-gated gallery use only — never wire this to real studies.
 */

/**
 * Fixed fusion weights from services/ml-api/ensemble_weights.json.
 * These are the real ones; do not invent new values here.
 */
const WEIGHTS = [
  { name: "densenet121", w: 0.42, hex: "#E8503A" },
  { name: "googlenet",   w: 0.33, hex: "#3B5BFF" },
  { name: "resnet18",    w: 0.25, hex: "#0F9D6E" },
];

/**
 * Per-model votes derived from the study's fused score, rather than hardcoded.
 *
 * Hardcoding them meant selecting a CLEAR study still showed three models voting
 * 0.99 — a panel contradicting the row it describes. The offsets below spread the
 * models slightly around the fused value while keeping the weighted sum equal to
 * it, so the arithmetic a reader checks actually holds:
 *
 *     Σ(p_i × w_i) ≈ fused
 *
 * Offsets are weight-balanced (0.42·+0.010 + 0.33·+0.002 + 0.25·−0.019 ≈ 0), so
 * the identity survives regardless of which study is selected.
 */
function votesFor(score: number | null) {
  if (score === null) return null;
  const offsets = [0.010, 0.002, -0.019];
  return WEIGHTS.map((m, i) => ({
    ...m,
    p: Math.min(0.999, Math.max(0.001, score + offsets[i])),
  }));
}

/** Draft impression text per severity. Illustrative — no model generates this today. */
const DRAFT: Record<string, string> = {
  CRITICAL: "Right apical pneumothorax. No mediastinal shift. Recommend immediate clinical correlation.",
  REVIEW:   "Patchy left basilar opacity, may reflect atelectasis or infection. Clinical correlation advised.",
  CLEAR:    "No acute cardiopulmonary process.",
};

function Viewport({ label = "image viewport", dark = false }: { label?: string; dark?: boolean }) {
  return (
    <div
      className={cn(
        "grid place-items-center rounded-lg border",
        dark ? "bg-black/40 border-white/10" : "bg-kx-ink/[0.03] border-kx-border"
      )}
    >
      <span className={cn("font-mono text-[12px]", dark ? "text-white/25" : "text-kx-muted")}>{label}</span>
    </div>
  );
}

function Note({ dark = false }: { dark?: boolean }) {
  return (
    <p className={cn("font-mono text-[10.5px] mt-3", dark ? "text-white/25" : "text-kx-muted/70")}>
      Sample rows. Not patient data. Draft text is illustrative.
    </p>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   R1 — Reporting Bench
   New Lantern's premise: the deliverable is a signed report. Queue, image and a
   live draft impression share one screen, so the radiologist edits and signs
   without leaving. Kroix's score becomes an input to the report rather than the
   output of the product.
   ══════════════════════════════════════════════════════════════════════════ */
export function ReaderReportingBench() {
  const [sel, setSel] = useState<Row>(ROWS[0]);
  const draft = sel.bucket ? DRAFT[sel.bucket] : "Awaiting inference.";
  const votes = votesFor(sel.score);

  return (
    <div className="bg-kx-surface p-8">
      <div className="grid grid-cols-[210px_1fr_320px] border border-kx-border rounded-lg overflow-hidden bg-white h-[540px]">
        {/* Queue */}
        <div className="border-r border-kx-border flex flex-col min-h-0">
          <div className="px-3 py-2.5 border-b border-kx-border">
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-kx-muted">unread · 6</span>
          </div>
          <ul className="overflow-y-auto flex-1">
            {ROWS.map((r) => {
              const b = r.bucket ? BUCKET[r.bucket] : null;
              return (
                <li key={r.id}>
                  <button
                    onClick={() => setSel(r)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 border-b border-kx-border/50 flex items-center gap-2 transition-colors",
                      sel.id === r.id ? "bg-kx-surface2" : "hover:bg-kx-surface/60"
                    )}
                  >
                    <span className="w-[3px] h-7 rounded-sm flex-shrink-0" style={{ background: b?.hex ?? "#E5E7EB" }} />
                    <span className="min-w-0">
                      <span className="block font-mono text-[11.5px] text-kx-ink">…{shortId(r.id)}</span>
                      <span className={cn("block font-mono text-[10.5px]", breaching(r) ? "text-kx-critical" : "text-kx-muted")}>
                        {elapsed(r.waited)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Viewport */}
        <div className="p-4 flex flex-col min-h-0 border-r border-kx-border">
          <div className="flex items-baseline justify-between mb-3">
            <span className="font-mono text-[11.5px] text-kx-muted">{sel.patient} · {sel.modality} · {sel.received}</span>
            <span className="font-mono text-[11.5px] text-kx-muted">1 / 1</span>
          </div>
          <Viewport />
        </div>

        {/* Report */}
        <div className="flex flex-col min-h-0">
          <div className="px-4 py-2.5 border-b border-kx-border flex items-center justify-between">
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-kx-muted">report</span>
            <Mic className="w-3.5 h-3.5 text-kx-muted" />
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-kx-muted mb-2">Impression</p>
            <div className="rounded-md border border-kx-border bg-kx-surface/60 p-3 mb-4">
              <p className="text-[13px] text-kx-ink leading-relaxed">{draft}</p>
              <p className="font-mono text-[10px] text-kx-muted mt-2.5 pt-2.5 border-t border-kx-border">
                draft · unsigned · edit before signing
              </p>
            </div>

            <p className="font-mono text-[10.5px] uppercase tracking-wider text-kx-muted mb-2">Kroix score</p>
            <div className="space-y-1.5 mb-4">
              {votes ? votes.map((m) => (
                <div key={m.name} className="flex items-center gap-2">
                  <span className="font-mono text-[10.5px] text-kx-muted w-[78px] flex-shrink-0">{m.name}</span>
                  <div className="flex-1 h-1 rounded-full bg-kx-surface2 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${m.p * 100}%`, background: m.hex }} />
                  </div>
                  <span className="font-mono text-[10.5px] text-kx-muted tabular-nums">{m.p.toFixed(2)}</span>
                </div>
              )) : (
                <p className="font-mono text-[11px] text-kx-muted">awaiting inference</p>
              )}
            </div>
          </div>

          <div className="px-4 py-3 border-t border-kx-border flex gap-2">
            <button className="flex-1 rounded-md bg-kx-ink text-white py-2 text-[12.5px] font-medium flex items-center justify-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Sign
            </button>
            <button className="px-3 rounded-md border border-kx-border text-kx-muted text-[12.5px]">Defer</button>
          </div>
        </div>
      </div>
      <Note />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   R2 — Overlay Inspector
   Rivet's floating chrome. The image takes the whole surface and everything
   else floats over it as translucent cards, dismissible. Maximises pixels for
   the thing being diagnosed, at the cost of hiding the queue behind a hover.
   ══════════════════════════════════════════════════════════════════════════ */
export function ReaderOverlayInspector() {
  const [sel, setSel] = useState<Row>(ROWS[0]);
  const [open, setOpen] = useState(true);
  const b = sel.bucket ? BUCKET[sel.bucket] : null;
  const votes = votesFor(sel.score);

  return (
    <div className="bg-kx-ink p-8">
      <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/50 h-[540px]">
        <Viewport dark label="" />

        {/* Collapsed queue rail */}
        <div className="absolute left-0 top-0 bottom-0 w-[58px] bg-black/45 backdrop-blur-sm border-r border-white/10 flex flex-col items-center py-3 gap-1.5">
          {ROWS.slice(0, 7).map((r) => {
            const rb = r.bucket ? BUCKET[r.bucket] : null;
            return (
              <button
                key={r.id}
                onClick={() => setSel(r)}
                title={`…${shortId(r.id)} · ${r.finding}`}
                className={cn(
                  "w-9 h-9 rounded-md border flex items-center justify-center transition-colors",
                  sel.id === r.id ? "border-white/50 bg-white/10" : "border-white/10 hover:border-white/25"
                )}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: rb?.hex ?? "rgba(255,255,255,0.25)" }} />
              </button>
            );
          })}
        </div>

        {/* Floating header */}
        <div className="absolute top-4 left-[74px] flex items-center gap-2.5">
          <span className="font-mono text-[11.5px] text-white/70 bg-black/50 backdrop-blur-sm rounded px-2.5 py-1.5 border border-white/10">
            …{shortId(sel.id)} · {sel.patient}
          </span>
          {b && (
            <span
              className="font-mono text-[11px] uppercase tracking-wider rounded px-2.5 py-1.5 backdrop-blur-sm border"
              style={{ background: `${b.hex}22`, color: b.hex, borderColor: `${b.hex}44` }}
            >
              {b.label} {sel.score?.toFixed(2)}
            </span>
          )}
        </div>

        {/* Floating inspector */}
        {open && (
          <div className="absolute right-4 top-4 w-[276px] rounded-lg bg-black/60 backdrop-blur-md border border-white/12 overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10">
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-white/45">why it ranked</span>
              <button onClick={() => setOpen(false)}>
                <X className="w-3.5 h-3.5 text-white/40 hover:text-white/80" />
              </button>
            </div>
            <div className="p-3.5 space-y-2.5">
              {(votes ?? []).map((m) => (
                <div key={m.name}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="font-mono text-[11px] text-white/60">{m.name}</span>
                    <span className="font-mono text-[11px] text-white/40 tabular-nums">{m.p.toFixed(2)} × {m.w}</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${m.p * 100}%`, background: m.hex }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="px-3.5 py-2.5 border-t border-white/10 flex justify-between">
              <span className="font-mono text-[11px] text-white/35">fused</span>
              <span className="font-mono text-[11px] text-white/80 tabular-nums">{sel.score?.toFixed(2) ?? "—"}</span>
            </div>
          </div>
        )}

        {/* Floating action bar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/12 rounded-full px-2 py-1.5">
          {["Agree", "Downgrade", "Escalate"].map((a) => (
            <button key={a} className="px-3.5 py-1.5 rounded-full font-mono text-[11.5px] text-white/65 hover:bg-white/10 transition-colors">
              {a}
            </button>
          ))}
          <span className="w-px h-4 bg-white/15 mx-1" />
          <button onClick={() => setOpen((v) => !v)} className="px-3 py-1.5 rounded-full font-mono text-[11.5px] text-white/45 hover:bg-white/10">
            <Layers className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <Note dark />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   R3 — Filmstrip
   The queue runs horizontally across the top as thumbnails, so the radiologist
   scans images rather than reading identifiers. Trades density for recognition
   — you see the next four studies as pictures, not as rows of text.
   ══════════════════════════════════════════════════════════════════════════ */
export function ReaderFilmstrip() {
  const [sel, setSel] = useState<Row>(ROWS[0]);
  const b = sel.bucket ? BUCKET[sel.bucket] : null;

  return (
    <div className="bg-kx-canvas p-8">
      <div className="border border-kx-border rounded-lg overflow-hidden bg-white">
        {/* Strip */}
        <div className="flex gap-2 p-3 border-b border-kx-border overflow-x-auto">
          {ROWS.map((r) => {
            const rb = r.bucket ? BUCKET[r.bucket] : null;
            return (
              <button
                key={r.id}
                onClick={() => setSel(r)}
                className={cn(
                  "flex-shrink-0 w-[124px] rounded-md border overflow-hidden text-left transition-colors",
                  sel.id === r.id ? "border-kx-ink" : "border-kx-border hover:border-kx-ink/30"
                )}
              >
                <div className="h-[76px] bg-kx-ink/[0.04] grid place-items-center relative">
                  <span className="font-mono text-[10px] text-kx-muted">CXR</span>
                  <span
                    className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                    style={{ background: rb?.hex ?? "#D1D5DB" }}
                  />
                </div>
                <div className="px-2 py-1.5 border-t border-kx-border">
                  <p className="font-mono text-[10.5px] text-kx-ink">…{shortId(r.id)}</p>
                  <p className={cn("font-mono text-[10px]", breaching(r) ? "text-kx-critical" : "text-kx-muted")}>
                    {elapsed(r.waited)} · {r.score?.toFixed(2) ?? "—"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Reader */}
        <div className="grid md:grid-cols-[1fr_260px] h-[400px]">
          <div className="p-4 border-r border-kx-border flex flex-col">
            <Viewport />
          </div>
          <div className="p-4 flex flex-col">
            <p className="font-mono text-[11px] text-kx-muted mb-1">…{shortId(sel.id)}</p>
            <h3 className="font-display text-[18px] text-kx-ink leading-snug mb-4">{sel.finding}</h3>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {[["score", sel.score?.toFixed(2) ?? "—"], ["waited", elapsed(sel.waited)], ["target", elapsed(sel.target)], ["mod", sel.modality]].map(([k, v]) => (
                <div key={k}>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-kx-muted">{k}</p>
                  <p className="font-mono text-[14px] text-kx-ink tabular-nums" style={{ color: k === "score" ? b?.hex : undefined }}>{v}</p>
                </div>
              ))}
            </div>

            <button className="mt-auto rounded-md bg-kx-ink text-white py-2.5 text-[13px] font-medium flex items-center justify-center gap-1.5">
              Open full reader <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      <Note />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   R4 — Tabbed Workspace
   herdr's shape: several studies open at once as tabs, rail grouped by state
   rather than severity. Fits how radiologists actually work — a case gets
   parked pending a prior or a clinical call, and picked up later.
   ══════════════════════════════════════════════════════════════════════════ */
export function ReaderTabbedWorkspace() {
  const openTabs = [ROWS[0], ROWS[2], ROWS[4]];
  const [active, setActive] = useState(0);
  const sel = openTabs[active];
  const b = sel.bucket ? BUCKET[sel.bucket] : null;
  const votes = votesFor(sel.score);

  const groups: [string, Row[]][] = [
    ["unread", ROWS.filter((r) => r.status === "new")],
    ["in progress", ROWS.filter((r) => r.status === "opened")],
    ["signed", ROWS.filter((r) => r.status === "read")],
  ];

  return (
    <div className="bg-kx-surface2 p-8">
      <div className="grid grid-cols-[196px_1fr] border border-kx-border rounded-lg overflow-hidden bg-white h-[540px]">
        {/* Grouped rail */}
        <div className="border-r border-kx-border overflow-y-auto">
          {groups.map(([label, items]) => (
            <div key={label}>
              <div className="px-3 py-2 sticky top-0 bg-kx-surface border-b border-kx-border">
                <span className="font-mono text-[10px] uppercase tracking-wider text-kx-muted">
                  {label} · {items.length}
                </span>
              </div>
              <ul>
                {items.map((r) => {
                  const rb = r.bucket ? BUCKET[r.bucket] : null;
                  return (
                    <li key={r.id}>
                      <div className="px-3 py-2 border-b border-kx-border/40 flex items-center gap-2 hover:bg-kx-surface/60 cursor-pointer">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: rb?.hex ?? "#D1D5DB" }} />
                        <span className="font-mono text-[11px] text-kx-ink">…{shortId(r.id)}</span>
                        <span className="font-mono text-[10.5px] text-kx-muted ml-auto tabular-nums">
                          {r.score?.toFixed(2) ?? "—"}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Tabs + pane */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-stretch border-b border-kx-border bg-kx-surface/50">
            {openTabs.map((t, i) => {
              const tb = t.bucket ? BUCKET[t.bucket] : null;
              return (
                <button
                  key={t.id}
                  onClick={() => setActive(i)}
                  className={cn(
                    "px-4 py-2.5 flex items-center gap-2 border-r border-kx-border font-mono text-[11.5px] transition-colors",
                    i === active ? "bg-white text-kx-ink" : "text-kx-muted hover:bg-white/60"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: tb?.hex ?? "#D1D5DB" }} />
                  …{shortId(t.id)}
                  <X className="w-3 h-3 text-kx-muted/50" />
                </button>
              );
            })}
            <span className="px-3 grid place-items-center text-kx-muted/50 font-mono text-[14px]">+</span>
          </div>

          <div className="p-4 flex-1 grid grid-cols-[1fr_236px] gap-4 min-h-0">
            <Viewport />
            <div className="flex flex-col">
              <h3 className="font-display text-[17px] text-kx-ink leading-snug mb-1">{sel.finding}</h3>
              <p className="font-mono text-[11px] text-kx-muted mb-4">{sel.patient} · {sel.received}</p>

              <div className="rounded-md border border-kx-border p-3 mb-3">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-kx-muted">fused</span>
                  <span className="font-mono text-[15px] tabular-nums" style={{ color: b?.hex }}>{sel.score?.toFixed(2) ?? "—"}</span>
                </div>
                {(votes ?? []).map((m) => (
                  <div key={m.name} className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1 rounded-full bg-kx-surface2 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${m.p * 100}%`, background: m.hex }} />
                    </div>
                    <span className="font-mono text-[10px] text-kx-muted tabular-nums w-8">{m.p.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <button className="mt-auto rounded-md border border-kx-border py-2 text-[12.5px] text-kx-muted flex items-center justify-center gap-1.5">
                <ArrowLeftRight className="w-3.5 h-3.5" /> Compare prior
              </button>
            </div>
          </div>
        </div>
      </div>
      <Note />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   R5 — Evidence Column
   Forward's "Strengths / Diligence Points" stack, applied to a study. A third
   column argues the case: what raised the score, what argues against it, and
   what is missing. Every line is sourced, so the radiologist can disagree with
   a specific claim instead of the whole number.
   ══════════════════════════════════════════════════════════════════════════ */
export function ReaderEvidenceColumn() {
  const [sel, setSel] = useState<Row>(ROWS[0]);
  const b = sel.bucket ? BUCKET[sel.bucket] : null;

  // Derived from the selected study, not hardcoded. A fixed evidence list would
  // argue for a high score while a clear study sat selected beside it.
  const votes = votesFor(sel.score);
  const abnormal = (sel.score ?? 0) > 0.5;

  const supports: [string, string][] = votes
    ? abnormal
      ? [
          [votes[0].name, `${votes[0].p.toFixed(2)} — highest weighted contributor`],
          [votes[1].name, `${votes[1].p.toFixed(2)} — concordant with primary model`],
          ["Grad-CAM", "activation localised, not diffuse"],
        ]
      : [
          [votes[0].name, `${votes[0].p.toFixed(2)} — no abnormality detected`],
          ["all three models", "agree within 0.03"],
          ["Grad-CAM", "no focal activation"],
        ]
    : [];

  const against: [string, string][] = votes
    ? [
        [votes[2].name, `${votes[2].p.toFixed(2)} — lowest of the three, still concordant`],
        ["prior study", "none on file for this patient hash"],
        ["severity", "score separates abnormal from normal, not urgent from routine"],
      ]
    : [];

  return (
    <div className="bg-kx-tint3 p-8">
      <div className="grid grid-cols-[188px_1fr_296px] border border-kx-border rounded-lg overflow-hidden bg-white h-[540px]">
        {/* Queue */}
        <div className="border-r border-kx-border overflow-y-auto">
          <div className="px-3 py-2.5 border-b border-kx-border sticky top-0 bg-white">
            <div className="flex items-center gap-1.5 text-kx-muted">
              <Search className="w-3 h-3" />
              <span className="font-mono text-[10.5px] uppercase tracking-wider">queue</span>
            </div>
          </div>
          {ROWS.map((r) => {
            const rb = r.bucket ? BUCKET[r.bucket] : null;
            return (
              <button
                key={r.id}
                onClick={() => setSel(r)}
                className={cn(
                  "w-full text-left px-3 py-2.5 border-b border-kx-border/50 transition-colors",
                  sel.id === r.id ? "bg-kx-surface2" : "hover:bg-kx-surface/60"
                )}
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[11.5px] text-kx-ink">…{shortId(r.id)}</span>
                  <span className="font-mono text-[11px] tabular-nums" style={{ color: rb?.hex ?? "#9CA3AF" }}>
                    {r.score?.toFixed(2) ?? "—"}
                  </span>
                </div>
                <p className="text-[11.5px] text-kx-muted truncate mt-0.5">{r.finding}</p>
              </button>
            );
          })}
        </div>

        {/* Viewport */}
        <div className="p-4 border-r border-kx-border flex flex-col">
          <div className="flex items-baseline justify-between mb-3">
            <span className="font-display text-[16px] text-kx-ink">{sel.finding}</span>
            <span className="font-mono text-[11px] text-kx-muted">{sel.patient}</span>
          </div>
          <Viewport />
        </div>

        {/* Evidence */}
        <div className="flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-kx-border flex items-baseline justify-between">
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-kx-muted">the case for {sel.score?.toFixed(2)}</span>
          </div>

          <div className="p-4 overflow-y-auto flex-1 space-y-5">
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-wider mb-2" style={{ color: b?.hex }}>
                Raised the score
              </p>
              <ul className="space-y-2">
                {supports.map(([k, v]) => (
                  <li key={k} className="flex gap-2">
                    <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: b?.hex }} />
                    <span className="text-[12.5px] leading-relaxed">
                      <span className="font-mono text-kx-ink">{k}</span>
                      <span className="text-kx-muted"> — {v}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-kx-muted mb-2">Argues against / missing</p>
              <ul className="space-y-2">
                {against.map(([k, v]) => (
                  <li key={k} className="flex gap-2">
                    <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0 bg-kx-muted" />
                    <span className="text-[12.5px] leading-relaxed">
                      <span className="font-mono text-kx-ink">{k}</span>
                      <span className="text-kx-muted"> — {v}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-md bg-kx-surface border border-kx-border p-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-kx-muted mb-1.5">what this is not</p>
              <p className="text-[12px] text-kx-muted leading-relaxed">
                A ranking signal, not a diagnosis. The score orders the queue; it does not
                interpret the study.
              </p>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-kx-border flex gap-2">
            <button className="flex-1 rounded-md bg-kx-ink text-white py-2 text-[12.5px] font-medium">Agree</button>
            <button className="flex-1 rounded-md border border-kx-border text-kx-muted py-2 text-[12.5px]">Disagree</button>
          </div>
        </div>
      </div>
      <Note />
    </div>
  );
}
