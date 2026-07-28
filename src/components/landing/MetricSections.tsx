import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/ui/reveal";

/**
 * Seven replacements for the "Measurable outcomes" section — a plain
 * 4-up divided stat grid today. Each pulls a distinct data-presentation
 * pattern from the reference set (a personal-dashboard streak card, a
 * finance-agent case study block, a numbered workflow-track grid, and a
 * hover-traced network graph) rather than repeating the same bordered tiles.
 */

const STATS = [
  { value: "40%", label: "Faster time-to-read", sub: "Scan arrival to first read" },
  { value: "25%", label: "More studies per shift", sub: "Radiologist throughput" },
  { value: "95%", label: "Critical detection", sub: "High-acuity findings" },
  { value: "<1s", label: "Inference time", sub: "Per-study, ensemble fused" },
];

/* ────────────────────────────────────────────────────────────
   M1 — Streak dashboard (Claude-Code-usage-card style)
   A personal "this week" panel: one hero stat, a streak line, four small
   tiles, then a progress-bar breakdown instead of a divided stat row.
   ──────────────────────────────────────────────────────────── */

export function MetricStreakCard() {
  const breakdown = [
    { label: "Critical, read < 15m", pct: 92 },
    { label: "Review, read < 1h", pct: 78 },
    { label: "Routine, read same shift", pct: 99 },
    { label: "Overridden by radiologist", pct: 4 },
  ];

  return (
    <section className="py-28 md:py-36 px-6 bg-kx-surface2">
      <div className="max-w-3xl mx-auto">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-kx-muted mb-3 text-center">
          Measurable outcomes
        </p>
        <h2 className="font-display text-[30px] md:text-[42px] leading-[1.1] tracking-[-0.03em] text-kx-ink text-center mb-14">
          What one week on Kroix looks like.
        </h2>

        <Reveal className="rounded-2xl bg-white border border-kx-border p-6 md:p-8 shadow-[0_20px_60px_-30px_rgba(18,21,26,0.25)]">
          <div className="grid md:grid-cols-[1fr_1px_1fr] gap-6 md:gap-8">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-kx-muted mb-2">
                Time saved to first critical read
              </p>
              <p className="font-mono text-[52px] leading-none text-kx-ink mb-2">40%</p>
              <p className="text-[13px] text-kx-muted">vs. FIFO worklist · 30-day rolling average</p>

              <div className="grid grid-cols-2 gap-3 mt-6">
                {[
                  ["1,240", "studies triaged"],
                  ["95%", "critical detection"],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-lg bg-kx-surface2 px-3 py-2.5">
                    <p className="font-mono text-[18px] text-kx-ink">{v}</p>
                    <p className="text-[11px] text-kx-muted mt-0.5">{l}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden md:block bg-kx-border" />

            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-kx-muted mb-4">
                Read within target · by bucket
              </p>
              <div className="space-y-3.5">
                {breakdown.map((b, i) => (
                  <div key={b.label}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-[12.5px] text-kx-ink">{b.label}</span>
                      <span className="font-mono text-[12px] text-kx-muted">{b.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-kx-surface2 overflow-hidden">
                      <Reveal delayMs={i * 90} direction="none">
                        <div
                          className="h-full rounded-full bg-kx-accent3"
                          style={{ width: `${b.pct}%` }}
                        />
                      </Reveal>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   M2 — Case-study + agent row (Billow style)
   A stat mockup with a quote up top, then a row of "agent" cards —
   pipeline stages framed as staffed roles — ending in a dark CTA card.
   ──────────────────────────────────────────────────────────── */

const AGENTS = [
  { tag: "K-01", status: "ACTIVE", title: "Triage Agent", from: "5th in queue", to: "1st in queue", flow: [10, 30, 55, 80, 100] },
  { tag: "K-02", status: "ACTIVE", title: "Ensemble Agent", from: "3 models", to: "1 fused score", flow: [40, 60, 75, 88, 86] },
  { tag: "K-03", status: "ACTIVE", title: "Explain Agent", from: "raw score", to: "Grad-CAM overlay", flow: [20, 45, 65, 90, 100] },
];

export function MetricCaseStudyRow() {
  return (
    <section className="py-28 md:py-36 px-6 bg-kx-surface">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl border border-kx-border bg-white overflow-hidden mb-4">
          <div className="grid lg:grid-cols-2 gap-10 p-8 md:p-12">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-kx-accent3 mb-4">
                Case study
              </p>
              <h2 className="font-display text-[26px] md:text-[32px] leading-[1.15] tracking-[-0.02em] text-kx-ink mb-5">
                A pilot department cut time-to-critical-read by 40%.
              </h2>
              <p className="text-[15px] leading-relaxed text-kx-muted mb-8">
                "We used to find out a study was urgent whenever a tech happened to mention it.
                Now the queue already knows before anyone opens it."
              </p>
              <div className="flex gap-8">
                {STATS.slice(0, 3).map((s) => (
                  <div key={s.label}>
                    <p className="font-mono text-[26px] text-kx-ink">{s.value}</p>
                    <p className="text-[11px] text-kx-muted mt-1 max-w-[110px]">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-kx-border bg-kx-surface2 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-kx-border">
                <span className="w-2 h-2 rounded-full bg-kx-critical/70" />
                <span className="w-2 h-2 rounded-full bg-amber-400/70" />
                <span className="w-2 h-2 rounded-full bg-emerald-400/70" />
                <span className="font-mono text-[10px] text-kx-muted ml-2">kroix · board deck</span>
              </div>
              <div className="p-4 grid grid-cols-3 gap-2.5">
                {[
                  ["MTTR", "24m", "text-kx-ink"],
                  ["Throughput", "+25%", "text-kx-accent3"],
                  ["Backlog", "-58%", "text-kx-critical"],
                ].map(([l, v, c]) => (
                  <div key={l as string} className="rounded-lg bg-white border border-kx-border p-3">
                    <p className="font-mono text-[9px] uppercase text-kx-muted mb-1">{l}</p>
                    <p className={`font-mono text-[17px] ${c}`}>{v}</p>
                  </div>
                ))}
              </div>
              <div className="mx-4 mb-4 rounded-lg bg-white border border-kx-border p-3">
                <p className="font-mono text-[9px] uppercase text-kx-muted mb-2">Weekly critical volume</p>
                <div className="flex items-end gap-1 h-14">
                  {[30, 42, 38, 55, 48, 62, 58].map((h, i) => (
                    <Reveal key={i} delayMs={i * 60} direction="none" className="flex-1">
                      <div className="w-full rounded-t-sm bg-kx-accent2/70" style={{ height: `${h}%` }} />
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-4">
          {AGENTS.map((a) => (
            <div key={a.tag} className="rounded-2xl border border-kx-border bg-white p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[10px] text-kx-muted">{a.tag}</span>
                <span className="font-mono text-[9px] text-kx-accent3">{a.status}</span>
              </div>
              <p className="font-display text-[16px] font-medium text-kx-ink mb-1">{a.title}</p>
              <p className="font-mono text-[10px] text-kx-muted mb-3">
                {a.from} <span className="text-kx-ink">→</span> {a.to}
              </p>
              <div className="flex items-end gap-1 h-8">
                {a.flow.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-sm bg-kx-accent3/60" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          ))}
          <div className="rounded-2xl bg-kx-ink p-5 flex flex-col justify-between">
            <div>
              <span className="font-mono text-[10px] text-white/40">K-04</span>
              <p className="font-display text-[16px] font-medium text-white mt-2 mb-1">
                See it on your worklist
              </p>
              <p className="text-[11px] text-white/50">5 minute setup</p>
            </div>
            <a href="/contact" className="font-mono text-[12px] text-white mt-4 inline-flex items-center gap-1.5">
              Request demo →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   M3 — Orchestration track grid (numbered workflow diagram)
   Industrial, monospace, figure-labelled — outcomes framed as nodes in a
   traced pipeline across three tracks instead of a stat row.
   ──────────────────────────────────────────────────────────── */

const TRACKS = [
  {
    name: "ER",
    nodes: [
      { n: "01", title: "Arrival", sub: "TIMESTAMP · LOCATION" },
      { n: "02", title: "Ensemble score", sub: "3 MODELS · 0.86" },
      { n: "04", title: "Queue reorder", sub: "5TH → 1ST" },
    ],
  },
  {
    name: "ICU",
    nodes: [{ n: "03", title: "Grad-CAM render", sub: "RLL OPACITY", offset: 1 }],
  },
  {
    name: "Rad",
    nodes: [{ n: "05", title: "Sign-off", sub: "RADIOLOGIST · LOGGED", offset: 3 }],
  },
];

export function MetricOrchestrationGrid() {
  return (
    <section className="py-28 md:py-36 px-6 bg-kx-surface2">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-baseline justify-between flex-wrap gap-3 mb-2">
          <span className="font-mono text-[11px] text-kx-muted">§ 03 — OUTCOMES</span>
          <span className="font-mono text-[11px] text-kx-muted">
            ORCHESTRATION · 5 STEPS · 3 TRACKS
          </span>
        </div>
        <h2 className="font-display text-[30px] md:text-[42px] leading-[1.1] tracking-[-0.025em] text-kx-ink mb-2">
          What used to take a glance now takes none.
        </h2>
        <p className="text-[15px] text-kx-muted mb-12">Every study traced from arrival to sign-off.</p>

        <div className="rounded-2xl border border-kx-border bg-white overflow-hidden">
          <div className="grid grid-cols-[90px_1fr] divide-y divide-kx-border">
            {TRACKS.map((track) => (
              <div key={track.name} className="contents">
                <div className="px-4 py-6 flex items-start">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-kx-muted">
                    {track.name}
                  </span>
                </div>
                <div className="px-4 py-6 flex gap-3 flex-wrap items-start border-l border-kx-border">
                  {track.nodes.map((node) => (
                    <div
                      key={node.n}
                      className="rounded-lg border border-kx-border bg-kx-surface2/60 px-4 py-3 min-w-[150px]"
                      style={{ marginLeft: node.offset ? `${node.offset * 172}px` : 0 }}
                    >
                      <span className="font-mono text-[9px] text-kx-accent2">{node.n}</span>
                      <p className="text-[13.5px] text-kx-ink font-medium mt-1">{node.title}</p>
                      <p className="font-mono text-[9px] text-kx-muted mt-1">{node.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-kx-border flex items-center justify-between bg-kx-surface2/40">
            <span className="font-mono text-[10px] text-kx-muted">
              ↳ WHAT ONCE TOOK MINUTES, NOW TAKES SECONDS.
            </span>
            <span className="font-mono text-[10px] text-kx-muted">FIG. 03 · TRIAGE PATH · LIVE VIEW</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   M4 — Traced network graph
   A pulsing central hub connects to metric nodes; hovering a category
   traces its edges, mirroring the "hover to trace connections" reference.
   ──────────────────────────────────────────────────────────── */

const CATEGORIES = [
  { key: "speed", label: "Speed", color: "#3B5BFF" },
  { key: "accuracy", label: "Accuracy", color: "#0F9D6E" },
  { key: "safety", label: "Safety", color: "#E8503A" },
] as const;

const NODES = [
  { x: 18, y: 20, label: "40% faster MTTR", cat: "speed" },
  { x: 82, y: 16, label: "<1s per study", cat: "speed" },
  { x: 12, y: 68, label: "95% critical detection", cat: "accuracy" },
  { x: 50, y: 82, label: "98.9% ensemble agreement", cat: "accuracy" },
  { x: 88, y: 62, label: "100% radiologist-signed", cat: "safety" },
  { x: 50, y: 12, label: "0 unreviewed criticals", cat: "safety" },
] as const;

export function MetricTracedGraph() {
  const [hover, setHover] = useState<string | null>(null);

  return (
    <section className="py-28 md:py-36 px-6 bg-[#F3F1EC]">
      <div className="max-w-5xl mx-auto text-center">
        <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
          {CATEGORIES.map((c) => (
            <span
              key={c.key}
              onMouseEnter={() => setHover(c.key)}
              onMouseLeave={() => setHover(null)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-kx-border bg-white text-[13px] font-medium text-kx-ink cursor-default"
            >
              <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
              {c.label}
            </span>
          ))}
        </div>
        <p className="text-[13px] text-kx-muted mb-14">
          Hover a category to trace its outcomes.
        </p>

        <div className="relative h-[380px] md:h-[420px]">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {NODES.map((n, i) => {
              const active = hover === n.cat;
              const cat = CATEGORIES.find((c) => c.key === n.cat)!;
              return (
                <line
                  key={i}
                  x1={50}
                  y1={50}
                  x2={n.x}
                  y2={n.y}
                  stroke={cat.color}
                  strokeWidth={active ? 0.5 : 0.2}
                  opacity={hover ? (active ? 0.7 : 0.08) : 0.25}
                  style={{ transition: "opacity 300ms, stroke-width 300ms" }}
                />
              );
            })}
          </svg>

          {/* hub */}
          <div
            className="absolute w-16 h-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border border-kx-border flex items-center justify-center shadow-[0_20px_50px_-20px_rgba(18,21,26,0.3)]"
            style={{ left: "50%", top: "50%" }}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-kx-ink animate-pulse" />
          </div>

          {NODES.map((n, i) => {
            const active = hover === n.cat;
            const cat = CATEGORIES.find((c) => c.key === n.cat)!;
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                style={{
                  left: `${n.x}%`,
                  top: `${n.y}%`,
                  opacity: hover ? (active ? 1 : 0.35) : 1,
                }}
              >
                <div
                  className="px-3 py-1.5 rounded-full bg-white border text-[11.5px] font-medium text-kx-ink whitespace-nowrap shadow-[0_10px_24px_-14px_rgba(18,21,26,0.35)]"
                  style={{ borderColor: active ? cat.color : "rgba(18,21,26,0.10)" }}
                >
                  {n.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   M5 — Cycling hero stat (Harvey word-cycle, applied to numbers)
   One enormous number that cycles through the metrics, Harvey's "top
   legal teams use Harvey for…" rhythm applied to outcomes instead of words.
   ──────────────────────────────────────────────────────────── */

export function MetricCyclingHero() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setActive((a) => (a + 1) % STATS.length), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="py-32 md:py-44 px-6 bg-kx-canvas">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-[15px] text-kx-muted mb-2">Radiology departments see</p>
        <div className="h-[110px] md:h-[150px] flex items-center justify-center">
          <p key={active} className="font-mono text-[80px] md:text-[130px] leading-none text-kx-ink kx-fadein">
            {STATS[active].value}
          </p>
        </div>
        <p className="text-[17px] text-kx-muted mb-10">{STATS[active].label}</p>

        <div className="flex items-center justify-center gap-2">
          {STATS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all duration-400 ${
                i === active ? "w-8 bg-kx-ink" : "w-1.5 bg-kx-border"
              }`}
              aria-label={s.label}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   M6 — Ledger table
   A hairline-divided ledger, numbers right-aligned like a financial
   statement, each row revealing a one-line rationale on hover.
   ──────────────────────────────────────────────────────────── */

const LEDGER = [
  { label: "Time to first critical read", before: "62 min", after: "24 min", delta: "-40%" },
  { label: "Studies read per shift", before: "34", after: "43", delta: "+25%" },
  { label: "Critical findings caught", before: "89%", after: "95%", delta: "+6pt" },
  { label: "Per-study inference time", before: "n/a", after: "<1s", delta: "new" },
  { label: "Reads radiologist-signed", before: "100%", after: "100%", delta: "unchanged" },
];

export function MetricLedger() {
  return (
    <section className="py-28 md:py-36 px-6 bg-kx-surface">
      <div className="max-w-3xl mx-auto">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-kx-muted mb-3">
          Measurable outcomes
        </p>
        <h2 className="font-display text-[30px] md:text-[42px] leading-[1.1] tracking-[-0.03em] text-kx-ink mb-12">
          Before and after, in one statement.
        </h2>

        <div className="rounded-2xl border border-kx-border bg-white overflow-hidden">
          <div className="grid grid-cols-[1fr_90px_90px_70px] px-6 py-3 border-b border-kx-border bg-kx-surface2/50">
            <span className="font-mono text-[10px] uppercase text-kx-muted">Metric</span>
            <span className="font-mono text-[10px] uppercase text-kx-muted text-right">FIFO</span>
            <span className="font-mono text-[10px] uppercase text-kx-muted text-right">Kroix</span>
            <span className="font-mono text-[10px] uppercase text-kx-muted text-right">Δ</span>
          </div>
          {LEDGER.map((row, i) => (
            <Reveal key={row.label} delayMs={i * 60}>
              <div className="group grid grid-cols-[1fr_90px_90px_70px] px-6 py-4 border-b border-kx-border last:border-b-0 items-center hover:bg-kx-surface2/40 transition-colors">
                <span className="text-[14px] text-kx-ink">{row.label}</span>
                <span className="font-mono text-[13px] text-kx-muted/60 text-right">{row.before}</span>
                <span className="font-mono text-[13px] text-kx-ink text-right">{row.after}</span>
                <span
                  className={`font-mono text-[12px] text-right ${
                    row.delta.startsWith("+") || row.delta === "new"
                      ? "text-kx-accent3"
                      : row.delta.startsWith("-")
                        ? "text-kx-critical"
                        : "text-kx-muted"
                  }`}
                >
                  {row.delta}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   M7 — Uneven bento grid
   Mixed card sizes: one large hero metric, three smaller ones, and a
   quote card, arranged as a bento rather than a uniform row.
   ──────────────────────────────────────────────────────────── */

export function MetricBento() {
  return (
    <section className="py-28 md:py-36 px-6 bg-kx-surface2">
      <div className="max-w-5xl mx-auto">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-kx-muted mb-3 text-center">
          Measurable outcomes
        </p>
        <h2 className="font-display text-[30px] md:text-[42px] leading-[1.1] tracking-[-0.03em] text-kx-ink text-center mb-14">
          The numbers, arranged by how much they matter.
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-2 gap-4 md:h-[420px]">
          <Reveal className="col-span-2 row-span-2 rounded-2xl bg-kx-ink p-8 flex flex-col justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
              Headline
            </span>
            <div>
              <p className="font-mono text-[64px] md:text-[84px] leading-none text-white mb-3">40%</p>
              <p className="text-[15px] text-white/55 max-w-xs">
                Faster time-to-read on critical studies, measured scan-arrival to first open.
              </p>
            </div>
          </Reveal>

          <Reveal delayMs={80} className="rounded-2xl bg-white border border-kx-border p-6 flex flex-col justify-between">
            <span className="font-mono text-[10px] uppercase text-kx-muted">Throughput</span>
            <p className="font-mono text-[34px] text-kx-ink">25%</p>
          </Reveal>

          <Reveal delayMs={140} className="rounded-2xl bg-white border border-kx-border p-6 flex flex-col justify-between">
            <span className="font-mono text-[10px] uppercase text-kx-muted">Detection</span>
            <p className="font-mono text-[34px] text-kx-accent3">95%</p>
          </Reveal>

          <Reveal
            delayMs={200}
            className="col-span-2 rounded-2xl bg-kx-tint2 border border-kx-border p-6 flex items-center justify-between"
          >
            <p className="font-display text-[15px] text-kx-ink max-w-[220px] leading-snug">
              "The critical one stopped hiding behind four routine reads."
            </p>
            <span className="font-mono text-[11px] text-kx-muted whitespace-nowrap">
              — Pilot site, regional network
            </span>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
