import { Reveal } from "@/components/ui/reveal";
import { TraceWaterfall } from "@/components/landing/TraceWaterfall";
import { useState } from "react";

/**
 * Five treatments of the "Every score, traceable" section — the explainability
 * block that sits between the speed/accuracy duo and the workflow cards.
 *
 * Shared source of truth so every variant argues from the same numbers: one
 * real-shaped study, three model votes, a fused score, and the audit trail
 * that follows it.
 */

const MODELS = [
  { name: "DenseNet121", p: 0.94, weight: 0.42, color: "#E8503A" },
  { name: "GoogLeNet", p: 0.88, weight: 0.33, color: "#3B5BFF" },
  { name: "ResNet18", p: 0.79, weight: 0.25, color: "#0F9D6E" },
];

const FUSED = 0.91;

const AUDIT = [
  { t: "07:41:02", who: "system", what: "Study received · chest_xray.dcm" },
  { t: "07:41:03", who: "ensemble", what: "3 forward passes · 830ms" },
  { t: "07:41:03", who: "ensemble", what: "tanh-weighted fusion → 0.91" },
  { t: "07:41:04", who: "queue", what: "Rank 5 → 1 (critical band)" },
  { t: "07:46:55", who: "Dr. Chen", what: "Confirmed · signed off" },
];

const STUDY = "study_7f2a91c4";

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                 */
/* ------------------------------------------------------------------ */

function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`font-mono text-[11px] uppercase tracking-[0.18em] ${className}`}>{children}</span>
  );
}

/** Floating annotation pill, the heyclicky/Osseus trick of labelling a mockup. */
function Pill({
  children,
  className = "",
  tone = "light",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "light" | "dark";
}) {
  const base =
    tone === "dark"
      ? "bg-kx-ink text-white"
      : "bg-white text-kx-ink border border-kx-border";
  return (
    <span
      className={`absolute z-20 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium shadow-[0_12px_30px_-12px_rgba(18,21,26,0.35)] ${base} ${className}`}
    >
      {children}
    </span>
  );
}

/** Horizontal model-vote bar used by several variants. */
function VoteBar({ m, on = true }: { m: (typeof MODELS)[number]; on?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[11px] text-kx-muted w-[86px] flex-shrink-0">{m.name}</span>
      <div className="flex-1 h-1.5 rounded-full bg-kx-surface2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-[900ms] ease-out"
          style={{ width: on ? `${m.p * 100}%` : "0%", background: m.color }}
        />
      </div>
      <span className="font-mono text-[11px] text-kx-ink w-8 text-right">{m.p.toFixed(2)}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* T1 — Provenance Bento (Osseus-style tinted card grid)               */
/* ------------------------------------------------------------------ */

export function TraceBento() {
  return (
    <section className="py-28 md:py-32 px-6 bg-kx-surface border-t border-kx-border">
      <div className="max-w-6xl mx-auto">
        <Reveal className="max-w-2xl mb-12">
          <Eyebrow className="text-kx-accent3 mb-4 block">Under the hood</Eyebrow>
          <h2 className="font-display text-[36px] md:text-[46px] leading-[1.05] tracking-[-0.03em] text-kx-ink">
            Nothing about a score is hidden from you.
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-5">
          <BentoCard
            lead="Three models vote, one number ships."
            body="Each network scores the study independently. The fused number is a weighted blend you can pull apart at any time."
            tag="Ensemble breakdown"
            tint="from-[#FDF3F1]"
            delay={0}
          >
            <div className="rounded-xl bg-white border border-kx-border p-5 space-y-3.5">
              {MODELS.map((m) => (
                <VoteBar key={m.name} m={m} />
              ))}
              <div className="pt-3 mt-1 border-t border-kx-border flex items-baseline justify-between">
                <span className="text-[13px] text-kx-muted">Fused priority</span>
                <span className="font-mono text-[22px] text-kx-critical font-medium">
                  {FUSED.toFixed(2)}
                </span>
              </div>
            </div>
          </BentoCard>

          <BentoCard
            lead="See where the model actually looked."
            body="Every score carries a Grad-CAM overlay, so the radiologist can agree or disagree with the evidence, not just the number."
            tag="Visual evidence"
            tint="from-[#EEF1FF]"
            delay={90}
          >
            <div className="rounded-xl bg-white border border-kx-border p-4">
              <div className="relative h-[168px] rounded-lg bg-kx-ink overflow-hidden">
                <div
                  className="absolute inset-0 opacity-70"
                  style={{
                    background:
                      "radial-gradient(140px circle at 38% 46%, rgba(232,80,58,0.55), transparent 70%), radial-gradient(90px circle at 62% 60%, rgba(59,91,255,0.35), transparent 70%)",
                  }}
                />
                <div className="absolute inset-0 grid grid-cols-7 grid-rows-5">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="border-r border-b border-white/[0.06]" />
                  ))}
                </div>
                <span className="absolute bottom-2.5 left-3 font-mono text-[10px] text-white/50">
                  gradcam · 14×14 grid
                </span>
              </div>
            </div>
          </BentoCard>

          <BentoCard
            lead="Every hand-off is written down."
            body="Arrival, inference, re-rank, sign-off. The log is append-only and tied to the clinician who confirmed it."
            tag="Audit trail"
            tint="from-[#EAF7F1]"
            delay={0}
          >
            <div className="rounded-xl bg-white border border-kx-border divide-y divide-kx-border">
              {AUDIT.map((a) => (
                <div key={a.t} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="font-mono text-[11px] text-kx-muted w-[58px] flex-shrink-0">{a.t}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wide text-kx-accent3 w-[62px] flex-shrink-0 truncate">
                    {a.who}
                  </span>
                  <span className="text-[12.5px] text-kx-ink truncate">{a.what}</span>
                </div>
              ))}
            </div>
          </BentoCard>

          <BentoCard
            lead="And the clock is traced too."
            body="Per-span timings for every stage of the pipeline, so a slow read is a thing you can point at rather than guess about."
            tag="Latency spans"
            tint="from-[#F1F2F6]"
            delay={90}
          >
            <TraceWaterfall />
          </BentoCard>
        </div>
      </div>
    </section>
  );
}

function BentoCard({
  lead,
  body,
  tag,
  tint,
  delay,
  children,
}: {
  lead: string;
  body: string;
  tag: string;
  tint: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <Reveal
      delayMs={delay}
      className={`rounded-2xl border border-kx-border bg-gradient-to-b ${tint} to-white p-6 md:p-7`}
    >
      <p className="font-display text-[19px] leading-snug tracking-[-0.01em] text-kx-ink mb-1.5">
        {lead}{" "}
        <span className="font-normal text-kx-muted">{body}</span>
      </p>
      <Eyebrow className="text-kx-muted/80 block mb-5 mt-3">{tag}</Eyebrow>
      {children}
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* T2 — Dark Stage (Starcloud-style cinematic band)                     */
/* ------------------------------------------------------------------ */

export function TraceDarkStage() {
  return (
    <section className="relative bg-kx-ink overflow-hidden border-t border-kx-border">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(900px circle at 20% 0%, rgba(59,91,255,0.22), transparent 60%), radial-gradient(700px circle at 85% 30%, rgba(232,80,58,0.18), transparent 60%)",
        }}
      />
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-28 md:py-36">
        <Reveal className="max-w-3xl mb-14">
          <Eyebrow className="text-white/40 mb-5 block">Under the hood</Eyebrow>
          <h2 className="font-editorial text-[46px] md:text-[68px] leading-[0.98] tracking-[-0.02em] text-white">
            Every score, traceable
            <br />
            <span className="italic text-white/50">back to the model that made it.</span>
          </h2>
        </Reveal>

        <Reveal delayMs={120} className="max-w-3xl">
          <TraceWaterfall />
        </Reveal>

        {/* Hairline three-up footer, straight out of the Starcloud fold */}
        <div className="grid md:grid-cols-3 gap-x-10 gap-y-8 mt-20">
          {[
            {
              h: "Decomposable",
              p: "Pull the fused number apart into three independent model votes and their weights.",
            },
            {
              h: "Visual",
              p: "A Grad-CAM overlay ships with every study, so the evidence is on screen next to the score.",
            },
            {
              h: "Attributable",
              p: "Every re-rank and sign-off is logged against a clinician and a timestamp.",
            },
          ].map((c, i) => (
            <Reveal key={c.h} delayMs={i * 90}>
              <div className="border-t border-white/25 pt-5">
                <p className="font-display text-[17px] text-white mb-2">{c.h}</p>
                <p className="text-[14.5px] text-white/45 leading-relaxed">{c.p}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* T3 — Inspector Window (Rivet-style browser mockup + grid lines)      */
/* ------------------------------------------------------------------ */

const INSPECTOR_TABS = [
  { id: "votes", label: "Model votes" },
  { id: "spans", label: "Latency spans" },
  { id: "log", label: "Audit log" },
] as const;

export function TraceInspector() {
  const [tab, setTab] = useState<(typeof INSPECTOR_TABS)[number]["id"]>("votes");

  return (
    <section className="relative bg-kx-canvas border-t border-kx-border overflow-hidden">
      {/* faint architectural grid, Rivet-style */}
      <div className="absolute inset-0 pointer-events-none hidden md:grid grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-l border-kx-border/60" />
        ))}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-28 md:py-32 grid md:grid-cols-[1.15fr_0.85fr] gap-14 items-center">
        <Reveal>
          <div className="rounded-xl border border-kx-border bg-kx-surface2 shadow-[0_40px_90px_-40px_rgba(18,21,26,0.45)] overflow-hidden">
            {/* browser chrome */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-kx-surface border-b border-kx-border">
              <div className="flex gap-1.5">
                {["#E8503A", "#E8B23A", "#0F9D6E"].map((c) => (
                  <span key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                ))}
              </div>
              <div className="flex-1 rounded-md bg-white border border-kx-border px-3 py-1 font-mono text-[11px] text-kx-muted truncate">
                kroix.app/reviewer/{STUDY}/trace
              </div>
            </div>

            <div className="flex bg-white border-b border-kx-border">
              {INSPECTOR_TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2.5 text-[12.5px] font-medium border-b-2 -mb-px transition-colors ${
                    tab === t.id
                      ? "border-kx-critical text-kx-ink"
                      : "border-transparent text-kx-muted hover:text-kx-ink"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="bg-white p-6 min-h-[280px] kx-fadein" key={tab}>
              {tab === "votes" && (
                <div className="space-y-4">
                  {MODELS.map((m) => (
                    <div key={m.name}>
                      <VoteBar m={m} />
                      <p className="font-mono text-[10.5px] text-kx-muted mt-1 ml-[98px]">
                        weight {m.weight.toFixed(2)} · contributes{" "}
                        {(m.p * m.weight).toFixed(3)}
                      </p>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-kx-border flex items-baseline justify-between">
                    <span className="text-[13px] text-kx-muted">tanh-weighted fusion</span>
                    <span className="font-mono text-[26px] text-kx-critical">{FUSED.toFixed(2)}</span>
                  </div>
                </div>
              )}
              {tab === "spans" && <TraceWaterfall />}
              {tab === "log" && (
                <div className="divide-y divide-kx-border -my-2">
                  {AUDIT.map((a) => (
                    <div key={a.t} className="flex items-center gap-4 py-2.5">
                      <span className="font-mono text-[11.5px] text-kx-muted w-[62px]">{a.t}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wide text-kx-accent2 w-[64px] truncate">
                        {a.who}
                      </span>
                      <span className="text-[13px] text-kx-ink">{a.what}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Reveal>

        <Reveal delayMs={120}>
          <Eyebrow className="text-kx-accent2 mb-4 block">Under the hood</Eyebrow>
          <h2 className="font-display text-[36px] md:text-[44px] leading-[1.05] tracking-[-0.03em] text-kx-ink mb-5">
            Open any score
            <br />
            and read it back.
          </h2>
          <p className="text-[16.5px] text-kx-muted leading-relaxed mb-6">
            The trace is part of the product, not a support ticket. Model votes, weights,
            per-stage timings and the full sign-off history sit one tab away from the study
            itself.
          </p>
          <p className="font-mono text-[12px] text-kx-muted">
            Try the tabs — that's the real inspector layout.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* T4 — Annotated Receipt (mockup + floating callout pills)             */
/* ------------------------------------------------------------------ */

export function TraceAnnotatedReceipt() {
  return (
    <section className="py-28 md:py-36 px-6 bg-kx-tint2 border-t border-kx-border relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-70"
        style={{
          background:
            "radial-gradient(800px circle at 70% 0%, rgba(59,91,255,0.10), transparent 62%)",
        }}
      />
      <div className="relative z-10 max-w-3xl mx-auto">
        <Reveal className="text-center mb-16">
          <Eyebrow className="text-kx-accent2 mb-4 block">Under the hood</Eyebrow>
          <h2 className="font-display text-[36px] md:text-[46px] leading-[1.05] tracking-[-0.03em] text-kx-ink mb-4">
            One study, receipt included.
          </h2>
          <p className="text-[17px] text-kx-muted max-w-lg mx-auto leading-relaxed">
            This is the whole record behind a single priority score — annotated so you can see
            what each line is doing.
          </p>
        </Reveal>

        <Reveal delayMs={100} className="relative">
          <Pill className="-top-4 -left-2 md:-left-16" tone="dark">
            Timestamped on arrival
          </Pill>
          <Pill className="top-[38%] -right-2 md:-right-20">Weights are visible, not baked in</Pill>
          <Pill className="-bottom-4 left-6 md:-left-12">A human closes every loop</Pill>

          <div className="rounded-2xl bg-white border border-kx-border shadow-[0_40px_90px_-40px_rgba(18,21,26,0.4)] overflow-hidden">
            <div className="px-6 py-4 border-b border-kx-border flex items-center justify-between">
              <span className="font-mono text-[12px] text-kx-ink">{STUDY}</span>
              <span className="font-mono text-[11px] text-kx-muted">audit #4471</span>
            </div>

            <div className="px-6 py-6 space-y-5 border-b border-kx-border">
              {MODELS.map((m) => (
                <div key={m.name} className="flex items-center gap-4">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: m.color }}
                  />
                  <span className="font-mono text-[12.5px] text-kx-ink w-[94px]">{m.name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-kx-surface2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${m.p * 100}%`, background: m.color }}
                    />
                  </div>
                  <span className="font-mono text-[12px] text-kx-muted w-24 text-right">
                    ×{m.weight.toFixed(2)}
                  </span>
                  <span className="font-mono text-[12.5px] text-kx-ink w-10 text-right">
                    {m.p.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="px-6 py-5 flex items-baseline justify-between border-b border-kx-border bg-kx-surface">
              <span className="text-[14px] text-kx-ink font-medium">Fused priority score</span>
              <span className="font-mono text-[30px] text-kx-critical leading-none">
                {FUSED.toFixed(2)}
              </span>
            </div>

            <div className="divide-y divide-kx-border">
              {AUDIT.map((a) => (
                <div key={a.t} className="flex items-center gap-4 px-6 py-3">
                  <span className="font-mono text-[11.5px] text-kx-muted w-[62px]">{a.t}</span>
                  <span className="text-[13px] text-kx-ink flex-1">{a.what}</span>
                  <span className="font-mono text-[10.5px] uppercase tracking-wide text-kx-muted">
                    {a.who}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* T5 — Contribution Graph (line-art network, hover to trace)           */
/* ------------------------------------------------------------------ */

export function TraceContributionGraph() {
  const [hover, setHover] = useState<number | null>(null);

  return (
    <section className="py-28 md:py-32 px-6 bg-kx-canvas border-t border-kx-border">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <Reveal>
          <Eyebrow className="text-kx-accent3 mb-4 block">Under the hood</Eyebrow>
          <h2 className="font-display text-[36px] md:text-[46px] leading-[1.05] tracking-[-0.03em] text-kx-ink mb-5">
            Follow a score
            <br />
            back to its source.
          </h2>
          <p className="text-[16.5px] text-kx-muted leading-relaxed mb-8">
            Hover a model to trace its path into the fused number. No black box — three
            independent votes, published weights, and the arithmetic in between.
          </p>

          <div className="space-y-1">
            {MODELS.map((m, i) => (
              <button
                key={m.name}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                className={`w-full text-left flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors ${
                  hover === i ? "border-kx-border bg-kx-surface" : "border-transparent"
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                <span className="font-mono text-[13px] text-kx-ink flex-1">{m.name}</span>
                <span className="text-[12.5px] text-kx-muted">weight {m.weight.toFixed(2)}</span>
                <span className="font-mono text-[13px] text-kx-ink w-10 text-right">
                  {m.p.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delayMs={120} className="relative">
          <svg viewBox="0 0 420 340" className="w-full h-auto">
            {/* edges */}
            {MODELS.map((m, i) => {
              const y = 70 + i * 100;
              const active = hover === null || hover === i;
              return (
                <path
                  key={m.name}
                  d={`M 96 ${y} C 200 ${y}, 220 170, 320 170`}
                  fill="none"
                  stroke={m.color}
                  strokeWidth={hover === i ? 2.4 : 1.2}
                  opacity={active ? (hover === i ? 0.95 : 0.35) : 0.08}
                  className="transition-all duration-300"
                />
              );
            })}

            {/* model nodes */}
            {MODELS.map((m, i) => {
              const y = 70 + i * 100;
              const active = hover === null || hover === i;
              return (
                <g
                  key={m.name}
                  opacity={active ? 1 : 0.2}
                  className="transition-opacity duration-300"
                >
                  <circle cx={72} cy={y} r={hover === i ? 13 : 10} fill={m.color} />
                  <circle cx={72} cy={y} r={22} fill="none" stroke={m.color} strokeWidth={0.8} opacity={0.35} />
                  <text
                    x={40}
                    y={y - 30}
                    textAnchor="start"
                    className="font-mono"
                    fontSize="10"
                    fill="#6B7280"
                  >
                    {m.name}
                  </text>
                </g>
              );
            })}

            {/* fusion node */}
            <circle cx={340} cy={170} r={54} fill="#12151A" />
            <circle cx={340} cy={170} r={68} fill="none" stroke="#12151A" strokeWidth="0.8" opacity="0.2" />
            <text
              x={340}
              y={166}
              textAnchor="middle"
              className="font-mono"
              fontSize="26"
              fill="#FFFFFF"
            >
              {hover === null ? FUSED.toFixed(2) : MODELS[hover].p.toFixed(2)}
            </text>
            <text
              x={340}
              y={186}
              textAnchor="middle"
              className="font-mono"
              fontSize="9"
              fill="rgba(255,255,255,0.5)"
            >
              {hover === null ? "FUSED" : MODELS[hover].name.toUpperCase()}
            </text>
          </svg>

          <p className="font-mono text-[11px] text-kx-muted text-center mt-2">
            {STUDY} · tanh-weighted fusion
          </p>
        </Reveal>
      </div>
    </section>
  );
}
