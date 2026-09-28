import { Reveal } from "@/components/ui/reveal";

/**
 * Speed & scope duo.
 *
 * Pairs a latency card with a model-performance card on one shared background.
 *
 * WHAT CHANGED AND WHY IT MUST NOT BE CHANGED BACK.
 *
 * This section previously rendered a "Scans reviewed per hour · with vs. without
 * Kroix" bar chart under a LIVE · 7-DAY badge. Those bars were `Math.random()`,
 * regenerated on every page load. No with/without productivity comparison has ever
 * been run, so the chart presented a fabricated head-to-head as live measurement.
 * It is gone. Do not reintroduce a comparative productivity claim until there is a
 * study behind it.
 *
 * The accuracy card previously read "Clinical-grade accuracy", carried a VALIDATED
 * badge, and cited "a held-out clinical dataset". None of that survives contact
 * with what was actually trained:
 *
 *   - Dataset is `paultimothymooney/chest-xray-pneumonia` (Kermany et al.,
 *     Cell 2018) — a PUBLIC dataset, not a clinical one.
 *   - The cohort is PEDIATRIC (ages 1-5), single centre. The product targets adult
 *     radiology worklists.
 *   - The task is BINARY pneumonia vs normal, not critical-finding detection.
 *   - `train.py` pools train/ + val/ + test/ before the 5-fold split, so the number
 *     is cross-validation on the pooled set — not held-out clinical performance.
 *
 * THE NUMBER ITSELF WAS ALSO WRONG. This card shipped 98.9%. No artifact in this
 * repo contains 98.9% — it appears nowhere in `ensemble_weights.json`, nowhere in
 * `train.py`'s output, nowhere. The shipped model's 5-fold CV mean accuracy is
 * 0.9771180957321854, i.e. 97.7%. A rounded-up figure with no source is the same
 * class of defect as a fabricated chart; it just looks more like a typo.
 *
 * "tanh-weighted fusion" is what `train.py` computes, so the phrase stays — but it
 * does not produce distinct per-model weights. Each weight is
 * tanh(precision)+tanh(recall)+tanh(f1)+tanh(auc); all four metrics land in
 * [0.97, 1.0], where tanh is saturated at ~0.7616, so every model scores ~3.046 and
 * normalisation collapses to 1/3 each. `ensemble_weights.json` records exactly that:
 * normalised_weights = [0.333…, 0.333…, 0.333…]. The fusion is a plain average.
 *
 * Kroix is an uncleared Class II CADt device (21 CFR 892.2080). "Clinical-grade"
 * and "validated" are promotional claims. Keep this card scoped to what was
 * measured; the limits block is the point of the card, not a disclaimer on it.
 */

/** Per-stage latency, matching the spans in TraceWaterfall. */
const STAGES = [
  { label: "densenet121", ms: 380, color: "#E8503A" },
  { label: "googlenet", ms: 260, color: "#3B5BFF" },
  { label: "resnet18", ms: 190, color: "#0F9D6E" },
  { label: "fusion", ms: 40, color: "#F5B301" },
  { label: "grad-cam", ms: 90, color: "#9AA4B2" },
];

const TOTAL_MS = STAGES.reduce((sum, s) => sum + s.ms, 0);

/**
 * 5-fold CV mean accuracy, read off the artifact the model shipped with:
 * services/ml-api/ensemble_weights.json → cv_results.mean_accuracy = 0.9771180957321854.
 * src/claims.test.ts re-derives this from that file at test time, so the number on
 * the page cannot drift from the number the model was trained to.
 */
const CV_ACCURACY_PCT = 97.7;

/** What the CV accuracy figure does and does not cover. The honest version of the claim. */
const SCOPE = [
  ["Task", "Binary — pneumonia vs. normal"],
  ["Data", "Public dataset (Kermany et al., 2018)"],
  ["Cohort", "Pediatric, single centre"],
  ["Method", "5-fold CV on pooled data"],
];

function Ring({ pct, color, size = 132, stroke = 10 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-kx-surface2" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (pct / 100) * c}
        style={{ transition: "stroke-dashoffset 900ms ease-out" }}
      />
    </svg>
  );
}

export function SpeedAccuracyDuo() {
  return (
    // tint3 rather than surface2: "What Kroix is" directly above is surface2, and
    // two identical backgrounds in a row read as one long section.
    <section className="py-28 md:py-36 px-6 bg-kx-tint3 relative overflow-hidden">
      <div className="relative z-10 max-w-[1240px] mx-auto">
        <Reveal className="text-center mb-16">
          <span className="text-kx-accent2 text-[12.5px] font-mono font-medium tracking-wide uppercase mb-4 block">
            02 · Speed &amp; scope
          </span>
          <h2 className="font-display text-[38px] md:text-[50px] leading-[1.04] tracking-[-0.025em] text-kx-ink mb-5">
            Fast enough to matter. Honest about the rest.
          </h2>
          <p className="text-[17.5px] text-kx-muted max-w-2xl mx-auto leading-relaxed">
            Sub-second inference, and a plain account of exactly what the model has been measured on.
          </p>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-7">
          {/* Latency card — real per-stage spans, no invented comparison */}
          <Reveal className="rounded-3xl bg-white border border-kx-border p-7 md:p-9 shadow-[0_20px_60px_-30px_rgba(18,21,26,0.2)]">
            <div className="flex items-baseline justify-between mb-1">
              <span className="font-mono text-[12px] uppercase tracking-wider text-kx-muted">Inference latency</span>
              <span className="font-mono text-[11px] text-kx-muted">{STAGES.length} SPANS</span>
            </div>
            <p className="font-mono text-[60px] leading-none text-kx-ink mb-2">{(TOTAL_MS / 1000).toFixed(2)}s</p>
            <p className="text-[14.5px] text-kx-muted mb-8">Per-study ensemble inference, scan to score</p>

            <p className="font-mono text-[11px] uppercase tracking-wider text-kx-muted mb-4">Where the time goes</p>
            <div className="space-y-3.5">
              {STAGES.map((s, i) => (
                <Reveal key={s.label} delayMs={i * 70} direction="none">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[12.5px] text-kx-ink">{s.label}</span>
                    <span className="font-mono text-[12px] text-kx-muted">{s.ms}ms</span>
                  </div>
                  <div className="h-2 rounded-full bg-kx-surface2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(s.ms / TOTAL_MS) * 100}%`, background: s.color }}
                    />
                  </div>
                </Reveal>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-7 pt-5 border-t border-kx-border">
              <span className="w-1.5 h-1.5 rounded-full bg-kx-accent2 flex-shrink-0" />
              <p className="text-[13px] text-kx-muted leading-relaxed">
                Typical single-study timing. Throughput under real queue load has not been measured.
              </p>
            </div>
          </Reveal>

          {/* Model performance card — number plus its actual scope */}
          <Reveal delayMs={100} className="rounded-3xl bg-white border border-kx-border p-7 md:p-9 shadow-[0_20px_60px_-30px_rgba(18,21,26,0.2)]">
            <div className="flex items-baseline justify-between mb-1">
              <span className="font-mono text-[12px] uppercase tracking-wider text-kx-muted">Model performance</span>
              <span className="font-mono text-[11px] text-kx-muted">PRE-CLINICAL</span>
            </div>
            <p className="text-[14.5px] text-kx-muted mb-7 max-w-md leading-relaxed">
              One number, and everything you need to judge what it's worth.
            </p>

            <div className="flex items-center gap-7 mb-8">
              <div className="relative flex items-center justify-center flex-shrink-0">
                <Ring pct={CV_ACCURACY_PCT} color="#3B5BFF" />
                <span className="absolute font-mono text-[24px] text-kx-ink">{CV_ACCURACY_PCT}%</span>
              </div>
              <div>
                <p className="text-[15px] text-kx-ink leading-snug mb-1.5">5-fold cross-validation accuracy</p>
                <p className="text-[13px] text-kx-muted leading-relaxed">
                  Ensemble of DenseNet121, GoogLeNet &amp; ResNet18. The tanh weighting in{" "}
                  <span className="font-mono text-[12px]">train.py</span> saturates on all three
                  models, so the published weights are equal — the fusion is a plain average.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {SCOPE.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 text-[13px]">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-kx-muted flex-shrink-0">{k}</span>
                  <span className="text-kx-ink text-right leading-snug">{v}</span>
                </div>
              ))}
            </div>

            <div className="mt-7 pt-5 border-t border-kx-border flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-kx-critical flex-shrink-0 mt-1.5" />
              <p className="text-[13px] text-kx-muted leading-relaxed">
                This is not clinical validation and not a cleared device. No prospective evaluation
                on adult worklists has been run yet — that's what we're doing now.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
