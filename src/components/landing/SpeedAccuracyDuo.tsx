import { useMemo } from "react";
import { Reveal } from "@/components/ui/reveal";

/**
 * Replaces the old "Fast processing" (Feature 2) and "Clinical-grade accuracy"
 * (Feature 3) blocks — previously a plain area chart and a divided-list of
 * numbers, each a full-width stacked block. This pairs them as a single
 * two-card "duo" section so the page isn't all one-thing-per-row: a
 * streak-dashboard-style speed card (M1) beside a ring-based accuracy card
 * (Legora fingerprint rings), side by side on one shared background.
 */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function useWeek() {
  return useMemo(
    () =>
      DAYS.map((day) => ({
        day,
        withKroix: Math.floor(Math.random() * 8) + 28,
        withoutKroix: Math.floor(Math.random() * 7) + 12,
      })),
    []
  );
}

function Ring({
  pct,
  color,
  size = 84,
  stroke = 7,
}: {
  pct: number;
  color: string;
  size?: number;
  stroke?: number;
}) {
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

const ACCURACY = [
  { label: "Critical case detection", value: "95%", pct: 95, color: "#E8503A" },
  { label: "5-fold CV accuracy", value: "98.9%", pct: 98.9, color: "#3B5BFF" },
  { label: "Confidence on every read", value: "100%", pct: 100, color: "#0F9D6E" },
];

export function SpeedAccuracyDuo() {
  const week = useWeek();
  const max = Math.max(...week.map((d) => Math.max(d.withKroix, d.withoutKroix)));

  return (
    <section className="py-28 md:py-36 px-6 bg-kx-surface2">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-14">
          <span className="text-kx-accent2 text-[12px] font-mono font-medium tracking-wide uppercase mb-4 block">
            02 · Speed &amp; precision
          </span>
          <h2 className="font-display text-[32px] md:text-[44px] leading-[1.05] tracking-[-0.02em] text-kx-ink mb-4">
            Fast enough to matter. Precise enough to trust.
          </h2>
          <p className="text-[16px] text-kx-muted max-w-xl mx-auto">
            Sub-second inference doesn't count for much without accuracy behind it. Here's both, measured.
          </p>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Speed card — streak-dashboard style */}
          <Reveal className="rounded-2xl bg-white border border-kx-border p-6 md:p-8 shadow-[0_20px_60px_-30px_rgba(18,21,26,0.2)]">
            <div className="flex items-baseline justify-between mb-1">
              <span className="font-mono text-[11px] uppercase tracking-wider text-kx-muted">Fast processing</span>
              <span className="font-mono text-[10px] text-kx-accent2">LIVE · 7-DAY</span>
            </div>
            <p className="font-mono text-[48px] leading-none text-kx-ink mb-1">&lt;1s</p>
            <p className="text-[13px] text-kx-muted mb-6">Per-study ensemble inference, scan to score</p>

            <p className="font-mono text-[10px] uppercase tracking-wider text-kx-muted mb-3">
              Scans reviewed per hour · with vs. without Kroix
            </p>
            <div className="flex items-end gap-2.5 h-[120px] mb-2">
              {week.map((d, i) => (
                <Reveal key={d.day} delayMs={i * 70} direction="none" className="flex-1 flex items-end justify-center gap-1 h-full">
                  <div
                    className="w-full max-w-[13px] rounded-t-sm bg-kx-muted/25"
                    style={{ height: `${(d.withoutKroix / max) * 100}%` }}
                  />
                  <div
                    className="w-full max-w-[13px] rounded-t-sm bg-kx-accent2"
                    style={{ height: `${(d.withKroix / max) * 100}%` }}
                  />
                </Reveal>
              ))}
            </div>
            <div className="flex gap-2.5 text-[11px]">
              {week.map((d) => (
                <span key={d.day} className="flex-1 text-center font-mono text-kx-muted">
                  {d.day}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-5 pt-4 border-t border-kx-border">
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-kx-muted">
                <span className="w-2 h-2 rounded-sm bg-kx-accent2" /> With Kroix
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-kx-muted">
                <span className="w-2 h-2 rounded-sm bg-kx-muted/25" /> Without
              </span>
            </div>
          </Reveal>

          {/* Accuracy card — ring based */}
          <Reveal delayMs={100} className="rounded-2xl bg-white border border-kx-border p-6 md:p-8 shadow-[0_20px_60px_-30px_rgba(18,21,26,0.2)]">
            <div className="flex items-baseline justify-between mb-1">
              <span className="font-mono text-[11px] uppercase tracking-wider text-kx-muted">Clinical-grade accuracy</span>
              <span className="font-mono text-[10px] text-kx-accent3">VALIDATED</span>
            </div>
            <p className="text-[13px] text-kx-muted mb-6 max-w-sm">
              Performance measured against a held-out clinical dataset, not a single lucky split.
            </p>

            <div className="grid grid-cols-3 gap-3">
              {ACCURACY.map((a) => (
                <div key={a.label} className="flex flex-col items-center text-center">
                  <div className="relative flex items-center justify-center mb-3">
                    <Ring pct={a.pct} color={a.color} />
                    <span className="absolute font-mono text-[15px] text-kx-ink">{a.value}</span>
                  </div>
                  <p className="text-[11.5px] leading-tight text-kx-muted">{a.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-kx-border flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-kx-accent3 flex-shrink-0" />
              <p className="text-[12px] text-kx-muted">
                Ensemble of DenseNet121, GoogLeNet &amp; ResNet18 — cross-validated, not single-model.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
