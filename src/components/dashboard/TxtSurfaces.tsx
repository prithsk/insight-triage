import { useState } from "react";
import { cn } from "@/lib/utils";
import { ORDERED, dur, shortDur, late, consumed, SampleNote } from "./TxtVariants";

/**
 * The rest of the inner app in the T-series language.
 *
 * Five worklist variants answer "what does the queue look like". These answer
 * the question that actually decides whether the language holds: the worklist
 * is a list, and any style survives a list. The reviewer, the analytics page
 * and the upload state are where a design either stays coherent or falls back
 * to cards and colour.
 *
 * Same rules as `TxtVariants`: landing tokens only, monospace, hairlines, no
 * cards, no radius, no icons, colour twice at most. And the same honesty
 * requirement, which matters more here than on the queue — these are the
 * surfaces that state numbers.
 *
 * SAMPLE DATA ONLY. DEV-gated gallery route; never production, never real
 * studies.
 */

const BAND_WORD: Record<string, string> = { CRITICAL: "critical", REVIEW: "review", CLEAR: "clear" };

function Section({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("border-t border-kx-border pt-4", className)}>
      <p className="font-mono text-[10.5px] tracking-[0.05em] text-kx-muted mb-3">{label}</p>
      {children}
    </div>
  );
}

function Field({ k, v, muted = false, warn = false }: { k: string; v: string; muted?: boolean; warn?: boolean }) {
  return (
    <div className="flex gap-3 py-1">
      <span className="font-mono text-[11.5px] text-kx-muted w-28 shrink-0">{k}</span>
      <span className={cn("font-mono text-[11.5px]", warn ? "text-kx-warn" : muted ? "text-kx-muted" : "text-kx-ink")}>{v}</span>
    </div>
  );
}

/* ── Reviewer ──────────────────────────────────────────────────────────────
   One study. The panel prints what the system does NOT know in the same
   weight as what it does — the cohort caveat sits in the same list as the
   accuracy, not in a footnote. Footnoting it is how 98.9% survived on the
   landing page for two months.
   ─────────────────────────────────────────────────────────────────────────── */
export function TxtReviewer() {
  const [vote, setVote] = useState<number | null>(null);
  const s = ORDERED[1];

  return (
    <div className="bg-kx-canvas px-10 py-7 font-mono text-kx-ink">
      <div className="flex items-baseline gap-3.5 pb-4">
        <span className="text-[13px] text-kx-accent2">← kroix/worklist</span>
        <span className="text-[13px] text-kx-muted">/</span>
        <span className="text-[13px] font-semibold">{s.id}</span>
        <span className="flex-1" />
        <span className="text-[12px] text-kx-muted">2 of 13</span>
      </div>

      <div className="grid grid-cols-[minmax(0,560px)_minmax(0,1fr)] gap-8 border-t border-kx-ink pt-5">
        <div className="flex flex-col">
          <div className="bg-kx-ink aspect-[4/5] relative flex items-center justify-center">
            <div
              className="w-[62%] h-[78%] relative"
              style={{ background: "radial-gradient(46% 40% at 50% 42%, #5C6067 0%, #2B2E33 48%, #15181D 80%)" }}
            >
              <span className="absolute left-[20%] top-[29%] w-[27%] h-[35%] rounded-full" style={{ background: "radial-gradient(circle, rgba(226,229,233,0.28), rgba(226,229,233,0) 70%)" }} />
              <span className="absolute right-[20%] top-[29%] w-[27%] h-[35%] rounded-full" style={{ background: "radial-gradient(circle, rgba(226,229,233,0.24), rgba(226,229,233,0) 70%)" }} />
              <span className="absolute left-1/2 top-[21%] w-[7%] h-[47%] -translate-x-1/2" style={{ background: "rgba(226,229,233,0.16)" }} />
            </div>
            <span className="absolute left-3.5 bottom-3 font-mono text-[10px] tracking-[0.1em] text-white/50">illustrative · no phi</span>
          </div>
          <div className="flex gap-1.5 pt-2.5">
            {["window", "invert", "zoom", "compare"].map((t) => (
              <button key={t} type="button" className="text-[11px] border border-kx-border text-kx-muted px-3 py-1.5 hover:text-kx-ink hover:border-kx-ink/25">{t}</button>
            ))}
            <span className="flex-1" />
            <span className="text-[11px] text-kx-muted self-center">no localization for this study</span>
          </div>
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-[11.5px] text-kx-muted">patient {s.patient} · {s.age} · {s.mod} · received {s.received}</span>
          <h3 className="font-display text-[27px] font-medium tracking-[-0.01em] mt-2.5 leading-tight">{s.finding}</h3>

          <div className="flex items-baseline gap-4 mt-4">
            <span className="text-[30px] tabular-nums font-medium">{s.score?.toFixed(2)}</span>
            <span className="text-[12px] text-kx-muted">{s.band ? `${BAND_WORD[s.band]} band` : "unscored"}</span>
            <span className="flex-1" />
            <span className={cn("text-[12px]", late(s) ? "text-kx-critical-ink" : "text-kx-muted")}>
              {dur(s.waited)} of {shortDur(s.target)} target
            </span>
          </div>
          <span className="flex h-[3px] bg-kx-ink/10 mt-2.5 relative overflow-hidden">
            <span className={cn("absolute inset-y-0 left-0", late(s) ? "bg-kx-critical" : "bg-kx-ink/25")} style={{ width: `${Math.min(100, consumed(s) * 100)}%` }} />
          </span>

          <Section label="provenance" className="mt-6">
            <Field k="model" v="ensemble · densenet121 + googlenet + resnet18" />
            <Field k="fusion" v="tanh-weighted · 0.333 / 0.333 / 0.333" />
            <Field k="cv accuracy" v="97.7% · 5-fold" />
            <Field k="cohort" v="Kermany 2018 · public, pediatric, single-centre, binary" muted />
            <Field k="confidence" v="distance to decision boundary — not calibrated" muted />
            <Field k="inference" v="1.24s · 9 forward passes (3 models × 3 TTA)" />
          </Section>

          <Section label="labs" className="mt-5">
            <p className="font-mono text-[10.5px] text-kx-warn mb-2">simulated from risk score — not a blood draw</p>
            <div className="grid grid-cols-6 gap-px bg-kx-border border border-kx-border">
              {[["CO2", "44", false], ["pH", "7.38", false], ["O2", "93", true], ["WBC", "12.4", true], ["CRP", "38", true], ["PCT", "0.9", false]].map(([k, v, flag]) => (
                <div key={k as string} className="bg-kx-canvas py-2 text-center">
                  <p className="font-mono text-[10px] text-kx-muted">{k as string}</p>
                  <p className={cn("font-mono text-[14px] tabular-nums mt-1", flag ? "text-kx-warn" : "text-kx-ink")}>{v as string}</p>
                </div>
              ))}
            </div>
          </Section>

          <span className="flex-1" />

          <Section label="was this priority right?" className="mt-5">
            <div className="flex gap-2 items-center">
              {["correct priority", "ranked too high", "ranked too low"].map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setVote(vote === i ? null : i)}
                  aria-pressed={vote === i}
                  className={cn(
                    "text-[11.5px] px-4 py-2.5 border",
                    vote === i ? "border-kx-accent2 bg-kx-tint2 text-kx-ink" : "border-kx-border text-kx-muted hover:text-kx-ink",
                  )}
                >
                  {label}
                </button>
              ))}
              <span className="flex-1" />
              <button type="button" className="text-[11.5px] bg-kx-ink text-white px-5 py-2.5">mark read →</button>
            </div>
            <SampleNote className="block mt-3" />
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ── Analytics ─────────────────────────────────────────────────────────────
   Numbers in a text file. No chart library, no gradient fills — a bar here is
   a run of background, and a distribution is a column of them.

   Every figure carries what produced it. The one comparison on this page
   (`median time to read`) is labelled as an SLA replay over historical data
   rather than a live A/B, because no A/B has been run — a synthetic "without
   Kroix" arm was removed from this product on 2026-08-10 and is not coming
   back through a mockup.
   ─────────────────────────────────────────────────────────────────────────── */
export function TxtAnalytics() {
  const bands = [
    { k: "critical", n: 3, pct: 23, fill: "bg-kx-critical" },
    { k: "review", n: 5, pct: 38, fill: "bg-kx-warn" },
    { k: "clear", n: 4, pct: 31, fill: "bg-kx-accent3" },
    { k: "unscored", n: 1, pct: 8, fill: "bg-kx-ink/25" },
  ];
  const days = [
    ["mon", 31, 26], ["tue", 38, 29], ["wed", 44, 34], ["thu", 36, 31],
    ["fri", 41, 33], ["sat", 18, 15], ["sun", 14, 12],
  ] as const;
  const maxDay = Math.max(...days.map((d) => d[1]));

  return (
    <div className="bg-kx-canvas px-10 py-7 font-mono text-kx-ink">
      <div className="flex items-baseline gap-3.5">
        <span className="text-[13px] font-semibold">kroix/analytics</span>
        <span className="text-[12px] text-kx-muted">last 7 days</span>
        <span className="flex-1" />
        <span className="text-[11.5px] text-kx-muted">updated 14:22</span>
      </div>

      <div className="grid grid-cols-4 border border-kx-ink/15 mt-5">
        {[
          ["studies scored", "222", "across two sites"],
          ["median time to read", "41m", "SLA replay, not an A/B"],
          ["target misses", "9", "4.1% of scored studies"],
          ["unscored", "3", "no model produced a score"],
        ].map(([k, v, note], i) => (
          <div key={k} className={cn("px-5 py-4", i < 3 && "border-r border-kx-ink/[0.09]")}>
            <p className="text-[10.5px] tracking-[0.05em] text-kx-muted">{k}</p>
            <p className="text-[30px] tabular-nums mt-1.5 leading-none">{v}</p>
            <p className="text-[11px] text-kx-muted mt-1.5">{note}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-10 mt-7">
        <Section label="band distribution">
          {bands.map((b) => (
            <div key={b.k} className="py-1.5">
              <div className="flex justify-between mb-1">
                <span className="text-[12px]">{b.k}</span>
                <span className="text-[11.5px] text-kx-muted tabular-nums">{b.n} · {b.pct}%</span>
              </div>
              <span className="flex h-1 bg-kx-ink/[0.08] relative overflow-hidden">
                <span className={cn("absolute inset-y-0 left-0", b.fill)} style={{ width: `${b.pct}%` }} />
              </span>
            </div>
          ))}
          <p className="text-[11px] text-kx-muted mt-3 leading-relaxed">
            The middle band is near-empty by construction. The ensemble is a binary
            abnormal-vs-normal classifier, so its scores pile up at both ends — that
            shape is the model working, not a gap in the data.
          </p>
        </Section>

        <Section label="studies read per day">
          {days.map(([d, total, onTime]) => (
            <div key={d} className="flex items-center gap-3 py-1">
              <span className="text-[11px] text-kx-muted w-8">{d}</span>
              <span className="flex-1 flex h-2.5 bg-kx-ink/[0.05] relative overflow-hidden">
                <span className="absolute inset-y-0 left-0 bg-kx-ink/20" style={{ width: `${(total / maxDay) * 100}%` }} />
                <span className="absolute inset-y-0 left-0 bg-kx-accent3" style={{ width: `${(onTime / maxDay) * 100}%` }} />
              </span>
              <span className="text-[11px] text-kx-muted tabular-nums w-16 text-right">{onTime}/{total}</span>
            </div>
          ))}
          <p className="text-[11px] text-kx-muted mt-3 leading-relaxed">
            Filled portion is studies read inside their target. Counts are of studies
            Kroix scored; it has no visibility into reads that never entered the queue.
          </p>
        </Section>
      </div>

      <div className="border-t border-kx-border pt-3 mt-6 flex items-center">
        <span className="text-[11px] text-kx-muted">
          no comparison arm on this page — a &ldquo;without Kroix&rdquo; number requires the SLA replay over a real historical worklist
        </span>
        <span className="flex-1" />
        <SampleNote />
      </div>
    </div>
  );
}

/* ── Upload & unscored ─────────────────────────────────────────────────────
   The state that decides whether people trust the product: what it looks like
   when inference FAILS. The study is stored and readable, no triage row is
   written, and the row says so — there is no substitute score.
   ─────────────────────────────────────────────────────────────────────────── */
export function TxtUpload() {
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(2);
  const stages = ["idle", "uploading", "scored", "unscored"] as const;

  return (
    <div className="bg-kx-canvas px-10 py-7 font-mono text-kx-ink">
      <div className="flex items-baseline gap-3.5">
        <span className="text-[13px] font-semibold">kroix/upload</span>
        <span className="flex-1" />
        <span className="text-[11.5px] text-kx-muted">preview state</span>
        {stages.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setStage(i as 0 | 1 | 2 | 3)}
            className={cn("text-[11.5px] px-2 py-0.5", stage === i ? "text-kx-ink border-b border-kx-accent2" : "text-kx-muted")}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="border border-dashed border-kx-ink/20 mt-5 px-8 py-10 text-center">
        <p className="text-[13px]">drop a DICOM, JPG or PNG here</p>
        <p className="text-[11.5px] text-kx-muted mt-2">or <span className="text-kx-accent2 underline underline-offset-4">choose a file</span> · max 50 MB</p>
        <p className="text-[11px] text-kx-muted mt-4">files are stored in your Supabase project · never sent anywhere else</p>
      </div>

      <div className="border border-kx-ink/15 mt-5">
        <div className="px-4 py-2.5 border-b border-kx-ink/[0.09] flex items-center gap-3 bg-kx-surface2">
          <span className="text-[11px] text-kx-muted">cxr_20260927_0114.dcm</span>
          <span className="flex-1" />
          <span className="text-[11px] text-kx-muted">4.2 MB</span>
        </div>

        <div className="px-4 py-4">
          {stage === 0 && <p className="text-[12px] text-kx-muted">waiting for a file.</p>}

          {stage === 1 && (
            <>
              <div className="flex justify-between mb-2">
                <span className="text-[12px]">uploading → scoring</span>
                <span className="text-[11.5px] text-kx-muted tabular-nums">62%</span>
              </div>
              <span className="flex h-0.5 bg-kx-ink/10 relative overflow-hidden">
                <span className="absolute inset-y-0 left-0 bg-kx-accent2 w-[62%]" />
              </span>
              <p className="text-[11px] text-kx-muted mt-3">
                first upload after an idle period can take up to 45s — the ensemble loads three
                torch models before it can answer
              </p>
            </>
          )}

          {stage === 2 && (
            <>
              <div className="flex items-baseline gap-4">
                <span className="text-[26px] tabular-nums">0.97</span>
                <span className="text-[12px] text-kx-muted">critical band · target 30m</span>
                <span className="flex-1" />
                <span className="text-[11.5px] text-kx-accent2">queued at position 3</span>
              </div>
              <Field k="model" v="ensemble · 1.24s" />
              <Field k="localization" v="none returned for this study" muted />
            </>
          )}

          {stage === 3 && (
            <>
              <p className="text-[12.5px] text-kx-warn">not scored — the model could not be reached</p>
              <p className="text-[11.5px] text-kx-muted mt-2 leading-relaxed max-w-[62ch]">
                The image is stored and readable. No triage result was written and the study sits
                last in the queue marked <span className="text-kx-ink">awaiting triage</span>. There is
                no fallback score: a number that did not come from the model would be indistinguishable
                from one that did, and the queue is ordered by that number.
              </p>
              <div className="flex gap-2 mt-4">
                <button type="button" className="text-[11.5px] bg-kx-ink text-white px-4 py-2">retry scoring</button>
                <button type="button" className="text-[11.5px] border border-kx-ink/20 px-4 py-2">keep unscored</button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-kx-border pt-3 mt-5 flex items-center">
        <span className="text-[11px] text-kx-muted">the unscored state is the one worth designing — it is what an investor sees if Railway is cold</span>
        <span className="flex-1" />
        <SampleNote />
      </div>
    </div>
  );
}
