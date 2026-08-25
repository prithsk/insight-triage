import { useState } from "react";
import { ArrowRight, Circle, Minus, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Seven ways to present operational analytics.
 *
 * The current page is four `bg-white/80 backdrop-blur-sm rounded-2xl` stat cards
 * with coloured trend pills, over a tab strip of area charts. That is the default
 * SaaS analytics layout — it would sit unchanged on a CRM — and it says nothing
 * specific about triage.
 *
 * References, named so the variants do not converge:
 *
 *  - RunInfra's BASELINE / OPTIMIZED / DELTA table and its live "Optimization
 *    run · 4/5 phases" panel. A1 and A3.
 *  - Forward's stat band ($100M+ / $20B / 25+) and its Strengths / Diligence
 *    Points evidence stack. A2 and A7.
 *  - The bento model-API page: small multiples behind hairline dividers. A4.
 *  - herdr's dark console with a counter row above it. A5.
 *  - Kroix's own SLA replay, which no reference has an equivalent of. A6.
 *
 * HONESTY. `hasRealData` is false in production today, so every one of these
 * would render empty. They are shown here populated with SAMPLE numbers so the
 * layout can be judged — each carries a label saying so. Whichever wins must
 * keep its empty state, and none of them may ever show a without-Kroix
 * comparison: that arm was deleted for being synthesised, and a real one
 * requires the SLA replay over historical data.
 */

const DAYS = ["Aug 13", "Aug 14", "Aug 15", "Aug 16", "Aug 17", "Aug 18", "Aug 19"];

const SERIES = {
  mttr:       [41, 38, 44, 36, 33, 35, 31],   // minutes, median time to review
  throughput: [22, 26, 19, 28, 31, 27, 30],   // studies read per hour
  override:   [14, 12, 15, 11, 9, 12, 10],    // % where radiologist changed priority
  volume:     [88, 104, 76, 112, 124, 108, 119],
};

const METRICS = [
  { key: "mttr",       label: "Median time to review", unit: "min",      now: 31,  prev: 41,  better: "down" as const },
  { key: "throughput", label: "Studies read per hour", unit: "/hr",      now: 30,  prev: 22,  better: "up"   as const },
  { key: "override",   label: "Priority overridden",   unit: "%",        now: 10,  prev: 14,  better: "down" as const },
  { key: "volume",     label: "Studies received",      unit: "",         now: 119, prev: 88,  better: "up"   as const },
];

/** SLA band targets, in minutes. Same bands the replay engine uses. */
const BANDS = [
  { band: "Critical", target: 30,   read: 118, breached: 4,  hex: "#E8503A" },
  { band: "Review",   target: 240,  read: 396, breached: 31, hex: "#F5B301" },
  { band: "Routine",  target: 1440, read: 217, breached: 2,  hex: "#0F9D6E" },
];

const delta = (m: typeof METRICS[number]) => {
  const d = ((m.now - m.prev) / m.prev) * 100;
  const good = m.better === "up" ? d > 0 : d < 0;
  return { pct: d, good, sign: d > 0 ? "+" : "" };
};

function Sample({ dark = false }: { dark?: boolean }) {
  return (
    <p className={cn("font-mono text-[10.5px] mt-3", dark ? "text-white/25" : "text-kx-muted/70")}>
      Sample figures for layout review. No comparison arm — Kroix has not been evaluated against a
      without-Kroix baseline.
    </p>
  );
}

/** Minimal inline sparkline. No chart library, no axes, no tooltip. */
function Spark({ data, hex, w = 96, h = 26 }: { data: number[]; hex: string; w?: number; h?: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={hex} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   A1 — Delta Table
   RunInfra's BASELINE / OPTIMIZED / DELTA table. Rows are metrics, columns are
   last week / this week / change. No charts at all: the comparison IS the
   presentation, and colour appears only on the delta.
   ══════════════════════════════════════════════════════════════════════════ */
export function AnalyticsDeltaTable() {
  return (
    <div className="bg-kx-canvas p-8">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="font-display text-[19px] text-kx-ink tracking-[-0.01em]">Week over week</h2>
        <span className="font-mono text-[11px] uppercase tracking-wider text-kx-muted">
          Aug 13 – Aug 19 vs prior 7d
        </span>
      </div>

      <div className="border border-kx-border rounded-lg overflow-hidden bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-kx-surface border-b border-kx-border">
              {["Metric", "Prior 7d", "This 7d", "Change", ""].map((h, i) => (
                <th
                  key={h}
                  className={cn(
                    "font-mono text-[10.5px] uppercase tracking-wider text-kx-muted font-medium py-2.5 px-4",
                    i === 0 ? "text-left" : "text-right",
                    i === 4 && "w-[110px]"
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m) => {
              const d = delta(m);
              return (
                <tr key={m.key} className="border-b border-kx-border/60 last:border-0">
                  <td className="px-4 py-3 text-[13.5px] text-kx-ink">{m.label}</td>
                  <td className="px-4 py-3 text-right font-mono text-[13px] text-kx-muted tabular-nums">
                    {m.prev}{m.unit}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[13px] text-kx-ink tabular-nums font-medium">
                    {m.now}{m.unit}
                  </td>
                  <td
                    className="px-4 py-3 text-right font-mono text-[13px] tabular-nums"
                    style={{ color: d.good ? "#0F9D6E" : "#E8503A" }}
                  >
                    {d.sign}{d.pct.toFixed(0)}%
                  </td>
                  <td className="px-4 py-3">
                    <Spark data={SERIES[m.key as keyof typeof SERIES]} hex={d.good ? "#0F9D6E" : "#E8503A"} w={90} h={20} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Sample />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   A2 — Stat Band
   Forward's three-up editorial band. Enormous numbers, serif, hairline-divided,
   with the qualifier underneath in small caps. Reads as a statement rather than
   a dashboard — the risk is that it invites impressive-sounding numbers.
   ══════════════════════════════════════════════════════════════════════════ */
export function AnalyticsStatBand() {
  const cells = [
    { n: "31",  unit: "min", cap: "Median time to review, this week" },
    { n: "1.2k", unit: "",   cap: "Studies scored since launch" },
    { n: "10",  unit: "%",   cap: "Priority overridden by a radiologist" },
  ];

  return (
    <div className="bg-kx-surface p-8">
      <div className="border border-kx-border rounded-lg bg-white overflow-hidden">
        <div className="px-7 pt-8 pb-6 text-center border-b border-kx-border">
          <h2 className="font-editorial text-[34px] md:text-[42px] leading-[1.08] text-kx-ink">
            What the queue did this week.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-kx-border">
          {cells.map((c) => (
            <div key={c.cap} className="px-7 py-9">
              <p className="font-editorial text-[56px] md:text-[68px] leading-[0.92] text-kx-ink">
                {c.n}
                <span className="text-[26px] text-kx-muted ml-1.5">{c.unit}</span>
              </p>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-kx-muted mt-4 leading-relaxed">
                {c.cap}
              </p>
            </div>
          ))}
        </div>
        <div className="px-7 py-3.5 border-t border-kx-border bg-kx-surface/60">
          <p className="text-[12px] text-kx-muted leading-relaxed">
            Counts of work done. None of these compare against not using Kroix.
          </p>
        </div>
      </div>
      <Sample />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   A3 — Run Log
   RunInfra's live "Optimization run · 4/5 phases" panel. Analytics as a
   chronological feed rather than an aggregate: every scored study is an event
   with its own timing. Shows the system working; poor for spotting a trend.
   ══════════════════════════════════════════════════════════════════════════ */
export function AnalyticsRunLog() {
  const events = [
    { t: "14:11:02", id: "…688.988", ev: "received",  detail: "CR · queued for inference",       ms: null },
    { t: "14:11:03", id: "…688.988", ev: "scored",    detail: "0.99 · critical",                  ms: 962  },
    { t: "14:09:47", id: "…688.981", ev: "opened",    detail: "by rad-04",                        ms: null },
    { t: "14:04:12", id: "…688.982", ev: "signed",    detail: "priority upheld",                  ms: null },
    { t: "13:58:30", id: "…688.983", ev: "overridden", detail: "critical → review by rad-02",     ms: null },
    { t: "13:47:11", id: "…688.982", ev: "scored",    detail: "0.97 · critical",                  ms: 948  },
  ];

  const evColor: Record<string, string> = {
    received: "#9CA3AF", scored: "#3B5BFF", opened: "#6B7280", signed: "#0F9D6E", overridden: "#E8503A",
  };

  return (
    <div className="bg-kx-tint2 p-8">
      <div className="border border-kx-border rounded-lg bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-kx-border">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-kx-accent3" />
            <span className="font-mono text-[12.5px] text-kx-ink">queue activity</span>
            <span className="font-mono text-[11.5px] text-kx-muted">live</span>
          </div>
          <span className="font-mono text-[11px] text-kx-muted">119 studies today · 6 shown</span>
        </div>

        <ul className="divide-y divide-kx-border/50">
          {events.map((e, i) => (
            <li key={i} className="px-5 py-3 flex items-center gap-4 hover:bg-kx-surface/40">
              <span className="font-mono text-[11.5px] text-kx-muted tabular-nums w-[62px] flex-shrink-0">{e.t}</span>
              <span
                className="font-mono text-[10.5px] uppercase tracking-wider w-[76px] flex-shrink-0"
                style={{ color: evColor[e.ev] }}
              >
                {e.ev}
              </span>
              <span className="font-mono text-[11.5px] text-kx-ink w-[74px] flex-shrink-0">{e.id}</span>
              <span className="text-[12.5px] text-kx-muted flex-1 truncate">{e.detail}</span>
              {e.ms && (
                <span className="font-mono text-[11.5px] text-kx-muted tabular-nums flex-shrink-0">{e.ms}ms</span>
              )}
            </li>
          ))}
        </ul>

        <div className="px-5 py-3 border-t border-kx-border bg-kx-surface/50 flex items-center justify-between">
          <span className="font-mono text-[11px] text-kx-muted">median inference 954ms</span>
          <button className="font-mono text-[11px] text-kx-muted hover:text-kx-ink flex items-center gap-1">
            full log <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
      <Sample />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   A4 — Small Multiples
   The bento page's hairline grid. Six panels, each one metric with a sparkline
   and its current value. Optimised for scanning many series at once rather
   than reading any one closely.
   ══════════════════════════════════════════════════════════════════════════ */
export function AnalyticsSmallMultiples() {
  const panels = [
    { label: "Median time to review", v: "31 min",  s: SERIES.mttr,       hex: "#0F9D6E", note: "-24% vs prior 7d" },
    { label: "Studies read per hour", v: "30",      s: SERIES.throughput, hex: "#0F9D6E", note: "+36% vs prior 7d" },
    { label: "Priority overridden",   v: "10%",     s: SERIES.override,   hex: "#0F9D6E", note: "-29% vs prior 7d" },
    { label: "Studies received",      v: "119",     s: SERIES.volume,     hex: "#3B5BFF", note: "+35% vs prior 7d" },
    { label: "Inference latency",     v: "954 ms",  s: [980, 966, 971, 958, 949, 962, 954], hex: "#3B5BFF", note: "p50, all models" },
    { label: "Critical share",        v: "6.7%",    s: [5.1, 6.0, 5.4, 7.2, 6.9, 6.3, 6.7], hex: "#E8503A", note: "of scored studies" },
  ];

  return (
    <div className="bg-kx-canvas p-8">
      <div className="border border-kx-border rounded-lg bg-white overflow-hidden">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-kx-border">
          {panels.map((p) => (
            <div key={p.label} className="p-5 -mt-px -ml-px">
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-kx-muted mb-3">{p.label}</p>
              <div className="flex items-end justify-between gap-3">
                <p className="font-display text-[28px] leading-none text-kx-ink tabular-nums">{p.v}</p>
                <Spark data={p.s} hex={p.hex} w={84} h={28} />
              </div>
              <p className="font-mono text-[11px] text-kx-muted mt-3">{p.note}</p>
            </div>
          ))}
        </div>
      </div>
      <Sample />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   A5 — Console
   herdr's counter row above a dark monospace readout. Everything is text; the
   only graphic is a bar built from block characters. Fits a reading room and
   fits an ops mindset — and it is the hardest to misread as marketing.
   ══════════════════════════════════════════════════════════════════════════ */
export function AnalyticsConsole() {
  const counters = [
    ["1,204", "STUDIES SCORED"],
    ["119",   "TODAY"],
    ["954ms", "MEDIAN INFERENCE"],
    ["10%",   "OVERRIDE RATE"],
  ];

  const bar = (v: number, max: number, width = 22) => {
    const filled = Math.round((v / max) * width);
    return "█".repeat(filled) + "·".repeat(width - filled);
  };

  return (
    <div className="bg-kx-ink p-8">
      <div className="grid grid-cols-2 md:grid-cols-4 border border-white/10 rounded-t-lg divide-x divide-white/10 overflow-hidden">
        {counters.map(([n, l]) => (
          <div key={l} className="px-5 py-6">
            <p className="font-display text-[30px] leading-none text-white tabular-nums">{n}</p>
            <p className="font-mono text-[10px] tracking-[0.12em] text-white/35 mt-2.5">{l}</p>
          </div>
        ))}
      </div>

      <div className="border-x border-b border-white/10 rounded-b-lg bg-black/25 p-5 font-mono">
        <p className="text-[11px] uppercase tracking-wider text-white/35 mb-3">
          time to review · last 7 days · minutes
        </p>
        {DAYS.map((d, i) => (
          <div key={d} className="flex items-center gap-3 py-0.5">
            <span className="text-[11.5px] text-white/40 w-[52px]">{d}</span>
            <span className="text-[11.5px] text-[#0F9D6E] tracking-[0.08em]">
              {bar(SERIES.mttr[i], Math.max(...SERIES.mttr))}
            </span>
            <span className="text-[11.5px] text-white/60 tabular-nums">{SERIES.mttr[i]}</span>
          </div>
        ))}
        <p className="text-[11px] text-white/30 mt-4 pt-3 border-t border-white/10">
          no baseline arm — kroix has not been measured against not-kroix
        </p>
      </div>
      <Sample dark />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   A6 — SLA Ledger
   No reference has an equivalent, because this one is specific to Kroix. Reads
   against the read-time targets by band and counts breaches — the metric the
   whole SLA replay exists to move. The replay column is deliberately empty
   until real historical data has been run through it.
   ══════════════════════════════════════════════════════════════════════════ */
export function AnalyticsSlaLedger() {
  const total = BANDS.reduce((s, b) => s + b.read, 0);
  const breached = BANDS.reduce((s, b) => s + b.breached, 0);

  return (
    <div className="bg-kx-tint3 p-8">
      <div className="border border-kx-border rounded-lg bg-white overflow-hidden">
        <div className="px-6 py-5 border-b border-kx-border flex items-baseline justify-between">
          <div>
            <h2 className="font-display text-[19px] text-kx-ink tracking-[-0.01em]">
              Read-time targets
            </h2>
            <p className="text-[12.5px] text-kx-muted mt-1">
              {breached} of {total} studies read outside their window this week.
            </p>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-kx-muted">assumed targets</span>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-kx-surface border-b border-kx-border">
              {["Band", "Target", "Read", "Breached", "Rate", "If reordered"].map((h, i) => (
                <th
                  key={h}
                  className={cn(
                    "font-mono text-[10.5px] uppercase tracking-wider text-kx-muted font-medium py-2.5 px-4",
                    i === 0 ? "text-left" : "text-right"
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BANDS.map((b) => (
              <tr key={b.band} className="border-b border-kx-border/60 last:border-0">
                <td className="px-4 py-3.5">
                  <span className="flex items-center gap-2.5">
                    <span className="w-[3px] h-4 rounded-sm" style={{ background: b.hex }} />
                    <span className="text-[13.5px] text-kx-ink">{b.band}</span>
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right font-mono text-[13px] text-kx-muted tabular-nums">
                  {b.target >= 1440 ? "24h" : b.target >= 60 ? `${b.target / 60}h` : `${b.target}m`}
                </td>
                <td className="px-4 py-3.5 text-right font-mono text-[13px] text-kx-muted tabular-nums">{b.read}</td>
                <td className="px-4 py-3.5 text-right font-mono text-[13px] tabular-nums" style={{ color: b.hex }}>
                  {b.breached}
                </td>
                <td className="px-4 py-3.5 text-right font-mono text-[13px] text-kx-ink tabular-nums">
                  {((b.breached / b.read) * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-kx-muted">
                    <Minus className="w-3 h-3" /> not run
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-6 py-4 border-t border-kx-border bg-kx-surface/50">
          <p className="text-[12.5px] text-kx-muted leading-relaxed max-w-2xl">
            <span className="text-kx-ink">The last column is the product.</span> It stays empty until
            the replay has been run over a department's historical worklist with throughput held
            fixed. Targets above are assumed, not contractual.
          </p>
        </div>
      </div>
      <Sample />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   A7 — Claims & Gaps
   Forward's Strengths / Diligence Points, turned on Kroix itself. Every number
   is stated as a claim with what backs it, beside an explicit list of what
   cannot yet be claimed. Makes the honesty constraint the design instead of a
   disclaimer bolted underneath it.
   ══════════════════════════════════════════════════════════════════════════ */
export function AnalyticsClaimsGaps() {
  const canSay = [
    ["954 ms median inference", "measured, every scored study, all three models"],
    ["119 studies scored today", "count from the studies table"],
    ["10% priority overridden", "radiologist actions recorded in feedback_events"],
    ["31 min median time to review", "arrival to first open, this workspace only"],
  ];
  const cannotSay = [
    ["Kroix reduced time to review", "no baseline — nothing measures what this queue would have done unsorted"],
    ["Kroix improved patient outcomes", "read timing is not care; the causal chain is unmeasured"],
    ["X% fewer missed findings", "no ground truth on missed findings in this workspace"],
    ["Clinical accuracy", "5-fold CV on a public pediatric dataset is not clinical validation"],
  ];

  return (
    <div className="bg-kx-surface2 p-8">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="border border-kx-border rounded-lg bg-white overflow-hidden">
          <div className="px-5 py-3.5 border-b border-kx-border flex items-center gap-2">
            <Circle className="w-3 h-3 text-kx-accent3 fill-kx-accent3" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-kx-accent3">
              what this workspace measures
            </span>
            <span className="font-mono text-[11px] text-kx-muted ml-auto">{canSay.length}</span>
          </div>
          <ul className="divide-y divide-kx-border/50">
            {canSay.map(([claim, src]) => (
              <li key={claim} className="px-5 py-3.5">
                <p className="text-[13.5px] text-kx-ink mb-1">{claim}</p>
                <p className="text-[12px] text-kx-muted leading-relaxed">{src}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="border border-kx-border rounded-lg bg-white overflow-hidden">
          <div className="px-5 py-3.5 border-b border-kx-border flex items-center gap-2">
            <Circle className="w-3 h-3 text-kx-critical" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-kx-critical">
              what it does not
            </span>
            <span className="font-mono text-[11px] text-kx-muted ml-auto">{cannotSay.length}</span>
          </div>
          <ul className="divide-y divide-kx-border/50">
            {cannotSay.map(([claim, why]) => (
              <li key={claim} className="px-5 py-3.5">
                <p className="text-[13.5px] text-kx-muted line-through decoration-kx-border mb-1">{claim}</p>
                <p className="text-[12px] text-kx-muted leading-relaxed">{why}</p>
              </li>
            ))}
          </ul>
          <div className="px-5 py-3 border-t border-kx-border bg-kx-surface/50">
            <p className="text-[12px] text-kx-muted">
              Each of these needs the SLA replay, a clearance, or a study that has not been run.
            </p>
          </div>
        </div>
      </div>
      <Sample />
    </div>
  );
}
