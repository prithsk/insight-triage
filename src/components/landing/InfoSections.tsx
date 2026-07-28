import { useEffect, useState } from "react";
import { Reveal } from "@/components/ui/reveal";

/**
 * Five candidates for the "more information" section that sits below the
 * stacking cards. All explicitly avoid plain bullet lists / bordered
 * rectangles — annotated callouts, chat narrative, switchable mockup, and
 * dark editorial pillars instead, in the mould of the Legora/Rivet/heyclicky
 * reference set.
 */

/* ────────────────────────────────────────────────────────────
   I1 — Annotated feature grid (Legora "go-to assistant" grid)
   Grey tiles with a mini scene and a floating pill callout overlapping
   the edge, rather than an icon + two lines of copy.
   ──────────────────────────────────────────────────────────── */

const ANNOTATED = [
  {
    title: "Fail-closed by default",
    body: "If the API key or auth check can't be verified, Kroix refuses the request rather than guessing.",
    tag: "Blocks on missing auth",
    tagPos: "top-4 -right-3",
  },
  {
    title: "Row-level security",
    body: "Every study, result and document is scoped per approved account at the database layer, not the app layer.",
    tag: "Enforced in Postgres",
    tagPos: "-bottom-3 left-8",
  },
  {
    title: "Grad-CAM on every result",
    body: "No score ships without the overlay that produced it, so a flag is something you check, not something you take on faith.",
    tag: "Never a bare number",
    tagPos: "top-4 -right-3",
  },
  {
    title: "Approval-gated accounts",
    body: "New signups can't touch a study until an admin approves them. No open self-serve access to PHI.",
    tag: "Admin sign-off required",
    tagPos: "-bottom-3 left-8",
  },
];

export function InfoAnnotatedGrid() {
  return (
    <section className="py-28 md:py-36 px-6 bg-kx-surface2">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-display text-[32px] md:text-[44px] leading-[1.05] tracking-[-0.03em] text-kx-ink text-center max-w-2xl mx-auto mb-16">
          Built to be trusted with clinical data.
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {ANNOTATED.map((f, i) => (
            <Reveal key={f.title} delayMs={i * 80}>
              <div className="relative rounded-2xl bg-white border border-kx-border p-8 h-full">
                <span
                  className={`absolute ${f.tagPos} rotate-[-3deg] bg-kx-ink text-white font-mono text-[10px] px-3 py-1.5 rounded-full shadow-[0_10px_24px_-10px_rgba(18,21,26,0.5)] whitespace-nowrap`}
                >
                  {f.tag}
                </span>
                <p className="font-display text-[19px] font-medium text-kx-ink mb-3">{f.title}</p>
                <p className="text-[14px] leading-relaxed text-kx-muted max-w-sm">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   I2 — Spotlight switcher (Rivet "directions" mockup)
   A color-flipped section: a switchable dark browser mockup on one side,
   the selector list + statement on the other.
   ──────────────────────────────────────────────────────────── */

const MODES = [
  {
    label: "Emergency department",
    tag: "High volume",
    detail: "Every walk-in chest film scored the instant it lands, so a silent pneumothorax never sits behind six routine reads.",
  },
  {
    label: "Overnight coverage",
    tag: "Thin staffing",
    detail: "One radiologist covering the whole hospital sees the worklist already sorted, not five studies deep before the urgent one.",
  },
  {
    label: "Rural / regional site",
    tag: "No on-call subspecialist",
    detail: "A generalist reading everything gets a second opinion on urgency, without waiting on a teleradiology callback.",
  },
];

export function InfoSpotlightSwitcher() {
  const [active, setActive] = useState(0);

  return (
    <section className="py-28 md:py-36 px-6 bg-kx-ink relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-70"
        style={{
          background:
            "radial-gradient(1000px circle at 15% 10%, rgba(59,91,255,0.16), transparent 55%), radial-gradient(900px circle at 90% 90%, rgba(232,80,58,0.14), transparent 55%)",
        }}
      />
      <div className="relative z-10 max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.15fr] gap-14 items-center">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40 mb-4">
            Where it runs
          </p>
          <h2 className="font-display text-[30px] md:text-[42px] leading-[1.1] tracking-[-0.025em] text-white mb-8">
            One ordering logic. Different reasons to need it.
          </h2>
          <div className="space-y-2">
            {MODES.map((m, i) => (
              <button
                key={m.label}
                onClick={() => setActive(i)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-300 ${
                  i === active
                    ? "bg-white/[0.08] border-white/25 text-white"
                    : "border-transparent text-white/45 hover:text-white/70"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-[15px] font-medium">{m.label}</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">{m.tag}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0B0E11] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/[0.03]">
            <span className="w-2.5 h-2.5 rounded-full bg-kx-critical/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
            <span className="font-mono text-[11px] text-white/40 ml-2">kroix · {MODES[active].label.toLowerCase()}</span>
          </div>
          <div className="p-8 min-h-[220px] flex flex-col justify-center">
            <p
              key={active}
              className="font-editorial text-[24px] md:text-[28px] leading-[1.4] text-white/85 kx-fadein"
            >
              {MODES[active].detail}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   I3 — Dark editorial pillars
   Big serif type on ink, three annotations set into the paragraph rather
   than a card grid.
   ──────────────────────────────────────────────────────────── */

export function InfoEditorialPillars() {
  return (
    <section className="py-32 md:py-44 px-6 bg-kx-ink">
      <div className="max-w-4xl mx-auto text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/35 mb-8">
          Three things Kroix will not do
        </p>
        <div className="space-y-14">
          {[
            ["Diagnose.", "Kroix orders the queue. A radiologist reads and signs every study — the model never makes the clinical call."],
            ["Replace your PACS.", "It layers over the worklist you already run. No new viewer to learn, no migration to schedule."],
            ["Hide its reasoning.", "Every score ships with the Grad-CAM overlay and per-model breakdown that produced it."],
          ].map(([h, b], i) => (
            <Reveal key={h as string} delayMs={i * 100}>
              <p className="font-editorial text-[30px] md:text-[42px] italic text-white/90 mb-3">{h}</p>
              <p className="text-[15px] md:text-[16px] leading-relaxed text-white/45 max-w-xl mx-auto">{b}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   I4 — Chat narrative (heyclicky voice-command bubbles)
   The product framed as a conversation a radiologist has with the queue,
   with a floating annotation bubble like the reference.
   ──────────────────────────────────────────────────────────── */

const CHAT = [
  { from: "user", text: "Kroix, what's waiting for me this morning?" },
  { from: "kroix", text: "4 studies scored. 1 flagged critical — ICU-1, respiratory distress, 0.86." },
  { from: "user", text: "Open it." },
  { from: "kroix", text: "Grad-CAM ready. Right lower lobe opacity, all three models agree." },
];

export function InfoChatNarrative({
  bgClass = "bg-kx-tint2",
  compact = false,
}: {
  bgClass?: string;
  /** Renders inside an existing card: drops the section chrome and stacks to one column. */
  compact?: boolean;
}) {
  const [shown, setShown] = useState(1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(CHAT.length);
      return;
    }
    if (shown >= CHAT.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), 1400);
    return () => clearTimeout(t);
  }, [shown]);

  return (
    <section
      className={`${compact ? "p-8 md:p-10" : "py-28 md:py-36 px-6"} ${bgClass} relative overflow-hidden`}
    >
      <div
        className={`mx-auto items-center ${
          compact
            ? "max-w-none grid gap-8"
            : "max-w-4xl grid lg:grid-cols-[0.9fr_1.1fr] gap-14"
        }`}
      >
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-kx-muted mb-4">
            The morning read
          </p>
          <h2
            className={`font-display leading-[1.1] tracking-[-0.025em] text-kx-ink mb-5 ${
              compact ? "text-[28px] md:text-[34px]" : "text-[30px] md:text-[40px]"
            }`}
          >
            It reads like a conversation, not a report.
          </h2>
          <p className={`text-[15px] leading-relaxed text-kx-muted ${compact ? "" : "max-w-sm"}`}>
            The worklist already knows what's urgent by the time a radiologist opens it.
            Nobody has to ask twice.
          </p>
        </div>

        <div className="relative">
          <div className="rounded-2xl bg-white border border-kx-border p-6 shadow-[0_30px_70px_-30px_rgba(18,21,26,0.25)] space-y-3 min-h-[280px]">
            {CHAT.slice(0, shown).map((m, i) => (
              <div
                key={i}
                className={`flex kx-fadein ${m.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <span
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-[13.5px] leading-snug ${
                    m.from === "user"
                      ? "bg-kx-ink text-white rounded-br-md"
                      : "bg-kx-surface2 text-kx-ink rounded-bl-md"
                  }`}
                >
                  {m.text}
                </span>
              </div>
            ))}
          </div>
          <span className="absolute -top-4 -right-4 bg-kx-accent3 text-white font-mono text-[10px] px-3 py-1.5 rounded-full rotate-3 shadow-[0_10px_24px_-10px_rgba(15,157,110,0.6)]">
            &lt;1s per reply
          </span>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   I5 — Abstract trust marks (Legora "Apple-level encryption" fingerprint)
   Compliance/security framed as abstract line-art icons with annotations,
   not a checklist.
   ──────────────────────────────────────────────────────────── */

const TRUST = [
  {
    title: "Encrypted in transit and at rest",
    note: "TLS everywhere, Supabase-managed encryption at rest",
    art: (
      <svg viewBox="0 0 64 64" className="w-16 h-16">
        <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.15" />
        <circle cx="32" cy="32" r="18" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <circle cx="32" cy="32" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
        <circle cx="32" cy="32" r="3" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: "Every read is audit-logged",
    note: "Sign-off, override, and access events, timestamped",
    art: (
      <svg viewBox="0 0 64 64" className="w-16 h-16">
        {[10, 22, 34, 46].map((y, i) => (
          <rect key={y} x="10" y={y} width={44 - i * 8} height="4" rx="2" fill="currentColor" opacity={0.2 + i * 0.2} />
        ))}
      </svg>
    ),
  },
  {
    title: "Non-diagnostic by design",
    note: "Radiologist sign-off required on every study",
    art: (
      <svg viewBox="0 0 64 64" className="w-16 h-16">
        <path d="M32 8 L54 18 V34 C54 46 44 54 32 58 C20 54 10 46 10 34 V18 Z" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <path d="M22 32 L29 39 L43 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.85" />
      </svg>
    ),
  },
];

export function InfoTrustMarks() {
  return (
    <section className="py-28 md:py-36 px-6 bg-kx-surface">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-display text-[32px] md:text-[44px] leading-[1.05] tracking-[-0.03em] text-kx-ink text-center max-w-xl mx-auto mb-16">
          Handled like the clinical data it is.
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {TRUST.map((t, i) => (
            <Reveal key={t.title} delayMs={i * 90}>
              <div className="rounded-2xl bg-white border border-kx-border p-8 text-center h-full flex flex-col items-center">
                <div className="text-kx-accent2 mb-6">{t.art}</div>
                <p className="font-display text-[16px] font-medium text-kx-ink mb-2">{t.title}</p>
                <p className="text-[13px] leading-relaxed text-kx-muted">{t.note}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
