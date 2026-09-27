import { useState } from "react";
import { cn } from "@/lib/utils";
import { ROWS, shortId, elapsed, pct, breaching } from "./WorklistVariants";

/**
 * E-series — the worklist as a document rather than an application.
 *
 * WHERE THIS COMES FROM. Sixteen design references were collected for this
 * product: Harvey, Moda, Petrarch, Forward, RonanRx, The Bridge, Strength Atlas,
 * Silicon Hills, Rivet. Not one of them is a dashboard. Every one of them makes
 * the same five moves:
 *
 *   1. warm off-white ground, never cold grey
 *   2. editorial serif carrying the one line that matters
 *   3. monospace for identifiers, metadata and provenance
 *   4. a tiny uppercase label where a heading would go
 *   5. near-monochrome — the focused thing is near-black, everything else recedes
 *
 * Harvey's "the top legal teams use Harvey for" panel is the clearest statement
 * of (5): seven phrases stacked, one in black, the rest fading out. Applied to a
 * reading queue that is not decoration — it IS triage. The study you should open
 * next should be the only thing on screen at full contrast.
 *
 * WHAT THE W-SERIES GOT RIGHT AND THIS KEEPS. W4 "Clock" is live today and its
 * premise stands: order by proximity to the read-time target, not by severity,
 * because the model is binary and the REVIEW band is structurally near-empty.
 * Every variant below keeps that ordering. What changes is voice, not logic.
 *
 * SAMPLE DATA ONLY. Rows come from `WorklistVariants.ROWS` — invented, and
 * deliberately bimodal because the ensemble is a binary classifier. This file is
 * imported by a DEV-gated gallery route and must never be rendered in production
 * or wired to real studies. A fabricated worklist that looks real is exactly the
 * failure class this repo keeps finding.
 */

/** Ordered the way the live worklist orders: closest to breaching its target first. */
const ORDERED = [...ROWS].sort((a, b) => {
  if (a.score === null) return 1;
  if (b.score === null) return -1;
  return b.waited / b.target - a.waited / a.target;
});

const SEVERITY_WORD: Record<string, string> = {
  CRITICAL: "Critical",
  REVIEW: "Review",
  CLEAR: "Clear",
};

/** Shared caption. Sample data must never read as real. */
function SampleNote({ dark = false }: { dark?: boolean }) {
  return (
    <p className={cn("font-mono text-[10.5px] mt-6", dark ? "text-white/30" : "text-kx-paper-muted/70")}>
      Sample rows · not patient data
    </p>
  );
}

/** The tiny uppercase mono label that sits where a heading would. */
function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p
      className={cn(
        "font-mono text-[10.5px] uppercase tracking-[0.18em]",
        dark ? "text-white/40" : "text-kx-paper-muted",
      )}
    >
      {children}
    </p>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   E1 — Focus
   Harvey's stacked phrase list, taken literally. The next study to read sits at
   full contrast in editorial serif; everything behind it fades and shrinks.
   Hovering or tabbing promotes a row, so the list stays browsable.
   ══════════════════════════════════════════════════════════════════════════ */
export function EditorialFocus() {
  const [active, setActive] = useState(0);
  const rows = ORDERED.slice(0, 7);
  const current = rows[active];

  return (
    <div className="bg-kx-paper px-8 py-20">
      <div className="max-w-6xl mx-auto grid grid-cols-12 gap-8 items-center">
        <div className="col-span-12 md:col-span-3">
          <Eyebrow>Next to read</Eyebrow>
          <p className="font-display text-[13px] text-kx-paper-muted leading-relaxed mt-3 max-w-[200px]">
            Ordered by time left against the read-time target — not by score.
          </p>
        </div>

        <div className="col-span-12 md:col-span-6">
          {rows.map((r, i) => {
            const isActive = i === active;
            const distance = Math.abs(i - active);
            return (
              <button
                key={r.id}
                type="button"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                aria-current={isActive ? "true" : undefined}
                className="block w-full text-left focus:outline-none focus-visible:underline decoration-1 underline-offset-8"
              >
                <span
                  className={cn(
                    "block font-editorial leading-[1.12] transition-all duration-300",
                    isActive ? "text-[42px] text-kx-paper-ink" : "text-[36px]",
                  )}
                  style={
                    isActive
                      ? undefined
                      : { color: `rgba(26,24,21,${Math.max(0.14, 0.4 - distance * 0.08)})` }
                  }
                >
                  {r.finding === "—" ? "Awaiting triage" : r.finding}
                </span>
              </button>
            );
          })}
          <SampleNote />
        </div>

        {/* The focused row's particulars. Mono, because these are identifiers. */}
        <div className="col-span-12 md:col-span-3">
          <div className="border-t border-kx-paper-line pt-4 space-y-2.5">
            {[
              ["Study", shortId(current.id)],
              ["Patient", current.patient],
              ["Modality", current.modality],
              ["Waiting", elapsed(current.waited)],
              ["Target", elapsed(current.target)],
              ["Severity", current.bucket ? SEVERITY_WORD[current.bucket] : "Unscored"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-kx-paper-muted">
                  {k}
                </span>
                <span className="font-mono text-[12.5px] text-kx-paper-ink tabular-nums">{v}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-6 w-full border border-kx-paper-ink/25 px-5 py-2.5 font-display text-[13px] text-kx-paper-ink hover:bg-kx-paper-ink hover:text-kx-paper transition-colors"
          >
            Open study
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   E2 — Split
   Moda's dark statement panel beside a light data panel. The left half says what
   the queue means in one sentence; the right half is the queue.
   ══════════════════════════════════════════════════════════════════════════ */
export function EditorialSplit() {
  const over = ORDERED.filter((r) => r.score !== null && breaching(r)).length;
  const unscored = ORDERED.filter((r) => r.score === null).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr] min-h-[560px]">
      {/* Statement */}
      <div className="bg-kx-paper-ink text-white px-10 py-14 flex flex-col justify-center">
        <Eyebrow dark>The queue</Eyebrow>
        <h2 className="font-editorial text-[46px] leading-[1.08] mt-5 mb-6">
          {over} studies are
          <br />
          close to breaching.
        </h2>
        <p className="text-[14px] text-white/55 leading-relaxed max-w-[320px]">
          Ordered by time remaining against each read-time target. A high score that has
          just arrived waits behind a lower score that has been sitting.
        </p>

        <div className="mt-10 space-y-3 border-t border-white/12 pt-6 max-w-[320px]">
          {[
            ["In queue", `${ORDERED.length}`],
            ["Approaching target", `${over}`],
            ["Awaiting triage", `${unscored}`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40">
                {k}
              </span>
              <span className="font-mono text-[15px] tabular-nums">{v}</span>
            </div>
          ))}
        </div>
        <SampleNote dark />
      </div>

      {/* Queue */}
      <div className="bg-kx-paper px-8 py-10 overflow-x-auto">
        <table className="w-full border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-kx-paper-line">
              {["Study", "Patient", "Finding", "Waiting", "Target", "Score"].map((h) => (
                <th
                  key={h}
                  className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-kx-paper-muted pb-3 font-normal"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ORDERED.map((r) => (
              <tr key={r.id} className="border-b border-kx-paper-line/60 last:border-0">
                <td className="py-3 font-mono text-[12px] text-kx-paper-muted">{shortId(r.id)}</td>
                <td className="py-3 font-mono text-[12px] text-kx-paper-ink">{r.patient}</td>
                <td className="py-3 pr-6">
                  <span className="font-editorial text-[19px] text-kx-paper-ink leading-tight">
                    {r.finding === "—" ? "Awaiting triage" : r.finding}
                  </span>
                </td>
                <td
                  className={cn(
                    "py-3 font-mono text-[12px] tabular-nums",
                    r.score !== null && breaching(r) ? "text-kx-critical-ink" : "text-kx-paper-muted",
                  )}
                >
                  {elapsed(r.waited)}
                </td>
                <td className="py-3 font-mono text-[12px] tabular-nums text-kx-paper-muted">
                  {elapsed(r.target)}
                </td>
                <td className="py-3 font-mono text-[12px] tabular-nums text-kx-paper-ink text-right">
                  {r.score === null ? "—" : (r.score * 100).toFixed(0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   E3 — Index
   Petrarch and Silicon Hills: numbered entries, hairline rules, the queue as an
   editorial index. Severity is a word set in the margin, never a colour chip.
   ══════════════════════════════════════════════════════════════════════════ */
export function EditorialIndex() {
  return (
    <div className="bg-kx-paper px-8 py-16">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-baseline justify-between border-b border-kx-paper-ink/20 pb-4 mb-2">
          <div>
            <Eyebrow>01 / Reading queue</Eyebrow>
            <h2 className="font-editorial text-[38px] text-kx-paper-ink mt-2 leading-none">Today</h2>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-kx-paper-muted">
            {ORDERED.length} studies
          </span>
        </div>

        {ORDERED.map((r, i) => (
          <article
            key={r.id}
            className="grid grid-cols-12 gap-4 items-baseline py-5 border-b border-kx-paper-line last:border-0"
          >
            <span className="col-span-1 font-mono text-[11px] text-kx-paper-muted tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>

            <div className="col-span-11 md:col-span-6">
              <h3 className="font-editorial text-[24px] text-kx-paper-ink leading-tight">
                {r.finding === "—" ? "Awaiting triage" : r.finding}
              </h3>
              <p className="font-mono text-[11px] text-kx-paper-muted mt-1.5">
                {shortId(r.id)} · {r.patient} · {r.modality} · received {r.received}
              </p>
            </div>

            {/* Severity as a word in the margin, the way a marginal note reads. */}
            <span className="col-span-6 md:col-span-2 font-display text-[13px] text-kx-paper-muted">
              {r.bucket ? SEVERITY_WORD[r.bucket] : "Unscored"}
            </span>

            <div className="col-span-6 md:col-span-3 text-right">
              <span
                className={cn(
                  "font-mono text-[13px] tabular-nums",
                  r.score !== null && breaching(r) ? "text-kx-critical-ink" : "text-kx-paper-ink",
                )}
              >
                {elapsed(r.waited)}{" "}
                <span className="text-kx-paper-muted">/ {elapsed(r.target)}</span>
              </span>
              <div className="mt-2 h-px bg-kx-paper-line relative overflow-hidden">
                <span
                  className={cn(
                    "absolute inset-y-0 left-0",
                    r.score !== null && breaching(r) ? "bg-kx-critical-ink" : "bg-kx-paper-ink/40",
                  )}
                  style={{ width: r.score === null ? "0%" : `${pct(r)}%` }}
                />
              </div>
            </div>
          </article>
        ))}
        <SampleNote />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   E4 — Brief
   RonanRx's clinical page: one study, stated in a sentence, with provenance
   printed in mono beside it rather than hidden in a tooltip. The reviewer.
   ══════════════════════════════════════════════════════════════════════════ */
export function EditorialBrief() {
  const r = ORDERED[0];

  return (
    <div className="bg-kx-paper px-8 py-16">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">
        {/* Image */}
        <div>
          <div className="aspect-[4/5] bg-kx-paper-ink relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background:
                  "radial-gradient(60% 45% at 50% 40%, rgba(255,255,255,0.35), transparent 70%)",
              }}
            />
            <span className="absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
              Illustrative · no PHI
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {["No localization for this study", "Simulated — not a real lab draw"].map((t) => (
              <span
                key={t}
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-kx-paper-muted border border-kx-paper-line px-3 py-1.5"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Statement */}
        <div>
          <Eyebrow>
            Study {shortId(r.id)} · patient {r.patient}
          </Eyebrow>
          <h2 className="font-editorial text-[44px] leading-[1.1] text-kx-paper-ink mt-4 mb-6">
            {r.finding}
          </h2>
          <p className="text-[15px] text-kx-paper-muted leading-relaxed max-w-[460px]">
            Kroix scored this study and placed it at the front of the queue. It does not make
            a diagnosis and it has not read the image for you — the ordering is the product,
            and the read is still yours.
          </p>

          <div className="mt-10 border-t border-kx-paper-line pt-6 space-y-3 max-w-[460px]">
            {[
              ["Risk score", r.score === null ? "—" : r.score.toFixed(2)],
              ["Band", r.bucket ? SEVERITY_WORD[r.bucket] : "Unscored"],
              ["Waiting", `${elapsed(r.waited)} of ${elapsed(r.target)} target`],
              ["Model", "ensemble · densenet121 + googlenet + resnet18"],
              ["Fusion", "tanh-weighted · 0.333 / 0.333 / 0.333"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-6">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-kx-paper-muted shrink-0">
                  {k}
                </span>
                <span className="font-mono text-[12.5px] text-kx-paper-ink text-right">{v}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mt-8">
            <button
              type="button"
              className="border border-kx-paper-ink/25 px-6 py-2.5 font-display text-[13px] text-kx-paper-ink hover:bg-kx-paper-ink hover:text-kx-paper transition-colors"
            >
              Mark as read
            </button>
            <button
              type="button"
              className="border border-kx-paper-line px-6 py-2.5 font-display text-[13px] text-kx-paper-muted hover:text-kx-paper-ink transition-colors"
            >
              Disagree with priority
            </button>
          </div>
          <SampleNote />
        </div>
      </div>
    </div>
  );
}
