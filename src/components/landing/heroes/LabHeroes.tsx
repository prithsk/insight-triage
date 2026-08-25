import { useEffect, useRef, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Seven hero treatments for the redesigned landing page.
 *
 * DEMO ONLY. These live on their own route and are imported by nothing in the
 * real Landing page. The production hero is untouched.
 *
 * THE BRIEF THEY ALL ARGUE. The current hero says "Every scan scored. The urgent
 * one surfaced." — a capability, not a problem — and its CTA offers a demo of a
 * deployment Kroix cannot legally provide. These seven all state the actual
 * thesis instead:
 *
 *     Worklists are read roughly in arrival order. Critical findings get
 *     flagged and routine studies are fine. The medium band waits longest
 *     because nothing sorts it.
 *
 * and they all capture email rather than promising a demo.
 *
 * HONESTY CONSTRAINTS, non-negotiable in every variant:
 *  - No performance claim, no outcome claim, no comparison against not-Kroix.
 *  - The waiting figures are the PROBLEM's shape, illustrative and labelled —
 *    not Kroix's results. That inversion is what makes a stat band usable here.
 *  - Pre-clearance status appears in the fold, not in a footer.
 *
 * References, named per variant so they do not converge: The Bridge (pixel
 * illustration), Legora (cinematic portrait), Starcloud (floating nav + ruled
 * columns), Petrarch (numbered dark editorial + marginalia), Forward (serif
 * stat band), RunInfra (drafting grid + live panel), Bento APIs (hairline split).
 */

const HEADLINE = {
  a: "The worklist reads in arrival order.",
  b: "Patients don't arrive in order of need.",
};

const SUB =
  "Kroix scores every chest X-ray as it lands and reorders the queue by how close each study is to its read-time target — with every model's contribution visible.";

/** The problem's shape, not Kroix's results. Illustrative. */
const PROBLEM_STATS = [
  { n: "4h", cap: "Typical target for a non-critical chest X-ray" },
  { n: "1st", cap: "Position a study gets by arriving, not by needing it" },
  { n: "0", cap: "Systems sorting the band in between" },
];

const STATUS = "Pre-clearance · in validation · not for clinical use";

/* ── shared bits ─────────────────────────────────────────────────────────── */

function EmailCapture({
  dark = false,
  size = "md",
}: {
  dark?: boolean;
  size?: "sm" | "md";
}) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p className={cn("text-[15px] font-medium", dark ? "text-emerald-400" : "text-kx-accent3")}>
        You're on the list.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true); // demo only — the real form writes to waitlist_signups
      }}
      className="flex flex-wrap gap-2.5 max-w-md"
    >
      <label className="sr-only" htmlFor={`lab-${size}-${dark}`}>Email</label>
      <input
        id={`lab-${size}-${dark}`}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@hospital.org"
        className={cn(
          "flex-1 min-w-[190px] rounded-full px-5 text-[15px] focus:outline-none transition-colors border",
          size === "sm" ? "py-2.5" : "py-3",
          dark
            ? "bg-white/8 border-white/20 text-white placeholder:text-white/35 focus:border-white/50"
            : "bg-white border-kx-border text-kx-ink placeholder:text-kx-muted/50 focus:border-kx-ink/35"
        )}
      />
      <button
        type="submit"
        className={cn(
          "rounded-full px-6 text-[15px] font-medium transition-opacity hover:opacity-90 flex items-center gap-2",
          size === "sm" ? "py-2.5" : "py-3",
          dark ? "bg-white text-kx-ink" : "bg-kx-ink text-white"
        )}
      >
        Join the waitlist
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}

function Status({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.13em]",
        dark ? "text-white/40" : "text-kx-muted"
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", dark ? "bg-emerald-400" : "bg-kx-accent3")} />
      {STATUS}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   H1 — Pixel Ward   (The Bridge)
   Pixel-art scene on warm cream, serif display with a single italic word, mono
   subhead under a tiny caps eyebrow. The illustration is a queue of films with
   one sliding forward — the thesis drawn rather than stated. Highest-risk of
   the seven: charming reads as unserious to a radiologist, but nobody forgets it.
   ══════════════════════════════════════════════════════════════════════════ */
export function HeroPixelWard() {
  const [shifted, setShifted] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShifted(true);
      return;
    }
    const t = setTimeout(() => setShifted(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // Eight "films" in the queue; index 5 is the urgent one that slides to front.
  const films = [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <section className="relative overflow-hidden px-6 py-20" style={{ background: "#EFEDDC" }}>
      {/* pixel clouds */}
      {[
        { top: 42, left: "12%", w: 96 },
        { top: 96, left: "68%", w: 130 },
        { top: 150, left: "40%", w: 74 },
      ].map((c, i) => (
        <div key={i} className="absolute" style={{ top: c.top, left: c.left }}>
          <div style={{ width: c.w, height: 14, background: "#FFFFFF", imageRendering: "pixelated" }} />
          <div style={{ width: c.w * 0.66, height: 12, background: "#FFFFFF", marginLeft: c.w * 0.16 }} />
        </div>
      ))}
      {/* pixel sun */}
      <div
        className="absolute"
        style={{ top: 64, left: "22%", width: 54, height: 54, background: "#F2C14E", boxShadow: "0 0 44px 20px rgba(242,193,78,0.28)" }}
      />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] mb-5" style={{ color: "#8A8467" }}>
          What we are fixing
        </p>
        <h1 className="font-editorial text-[40px] md:text-[54px] leading-[1.1] mb-5" style={{ color: "#1E1B12" }}>
          {HEADLINE.a}
          <br />
          Patients don't arrive in <em>order of need.</em>
        </h1>
        <p className="font-mono text-[13.5px] leading-relaxed max-w-xl mx-auto mb-9" style={{ color: "#6E6853" }}>
          Kroix reorders the queue by how close each study is to its read-time target.
        </p>

        <div className="flex justify-center mb-8">
          <EmailCapture />
        </div>
        <Status />
      </div>

      {/* the queue, drawn */}
      <div className="relative z-10 mt-14 flex items-end justify-center gap-1.5 h-[132px]">
        {films.map((i) => {
          const urgent = i === 5;
          const order = shifted && urgent ? -6 : i;
          return (
            <div
              key={i}
              className="transition-all duration-[900ms]"
              style={{
                order,
                width: 44,
                height: urgent ? 104 : 78,
                background: urgent ? "#C0432C" : "#D9D5BE",
                transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              <div style={{ height: 8, background: "rgba(0,0,0,0.10)" }} />
            </div>
          );
        })}
      </div>
      <div className="relative z-10 mx-auto mt-0" style={{ height: 10, maxWidth: 460, background: "#B9B49B" }} />
      <p className="relative z-10 text-center font-mono text-[10.5px] mt-3" style={{ color: "#8A8467" }}>
        Illustrative. The red study is the one that has waited closest to its target.
      </p>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   H2 — Cinematic   (Legora)
   Full-bleed dark field, thin announcement bar above the nav, huge tight sans
   set low with a single CTA beside a one-line qualifier. Legora uses footage of
   a lawyer mid-thought; this uses a treated radiographic field, because stock
   footage of a doctor is the most generic asset in healthcare marketing.
   ══════════════════════════════════════════════════════════════════════════ */
export function HeroCinematic() {
  return (
    <section className="relative min-h-[640px] flex flex-col overflow-hidden bg-[#0C0F12]">
      {/* radiographic field */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1100px 620px at 62% 34%, rgba(255,255,255,0.13), transparent 62%), radial-gradient(700px 500px at 26% 72%, rgba(59,91,255,0.10), transparent 66%), #0C0F12",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.35] mix-blend-screen"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 3px)",
        }}
      />

      {/* announcement bar */}
      <div className="relative z-10 border-b border-white/10 py-2.5 text-center">
        <span className="font-mono text-[12px] text-white/55">
          Now measuring on historical worklists ·{" "}
          <span className="text-white/85 underline underline-offset-2">what the replay does →</span>
        </span>
      </div>

      {/* nav */}
      <div className="relative z-10 flex items-center justify-between px-8 py-5">
        <span className="font-display text-[17px] font-semibold tracking-[0.14em] text-white">KROIX</span>
        <div className="hidden md:flex items-center gap-7">
          {["Product", "Method", "Regulatory", "About"].map((l) => (
            <span key={l} className="text-[14px] text-white/55 hover:text-white cursor-pointer transition-colors">{l}</span>
          ))}
        </div>
        <button className="rounded-full bg-white text-kx-ink px-5 py-2 text-[14px] font-medium flex items-center gap-2">
          Join the waitlist <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* statement, set low */}
      <div className="relative z-10 mt-auto px-8 pb-14 max-w-5xl mx-auto w-full text-center">
        <h1 className="font-display text-[44px] md:text-[68px] leading-[1.0] tracking-[-0.035em] text-white mb-6">
          Read in the order
          <br />
          patients need.
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-5">
          <p className="text-[15.5px] text-white/55 max-w-sm text-left">
            Worklists run first-in, first-out. The studies in the middle wait longest.
          </p>
          <div className="w-full sm:w-auto flex justify-center">
            <EmailCapture dark size="sm" />
          </div>
        </div>
        <div className="mt-7">
          <Status dark />
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   H3 — Orbit   (Starcloud)
   Floating pill nav over a full-bleed field, statement centred high, and three
   hairline-ruled columns sitting directly on the image at the bottom. The rules
   are the signature — they turn a photo into a structured page.
   ══════════════════════════════════════════════════════════════════════════ */
export function HeroOrbit() {
  const cols = [
    ["Ordered by deadline", "Not by arrival, and not by score alone — by how close a study is to its read-time target."],
    ["Every score arguable", "Three models, published weights, each contribution visible. Disagree with one, not with 'the AI'."],
    ["Measured, not claimed", "The replay runs against a department's own history with throughput held fixed."],
  ];

  return (
    <section className="relative min-h-[660px] flex flex-col overflow-hidden bg-[#0A0C0F]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 700px at 50% 118%, rgba(232,80,58,0.30), transparent 60%), radial-gradient(1200px 800px at 50% 130%, rgba(255,255,255,0.16), transparent 55%), #0A0C0F",
        }}
      />
      {/* horizon curve */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: -540,
          width: 1500,
          height: 900,
          borderRadius: "50%",
          background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02))",
          border: "1px solid rgba(255,255,255,0.14)",
        }}
      />

      {/* floating pill nav */}
      <div className="relative z-10 flex items-center justify-between px-7 py-5">
        <span className="font-display text-[17px] font-semibold text-white">Kroix</span>
        <div className="hidden md:flex items-center gap-1 rounded-full bg-white/[0.07] border border-white/12 backdrop-blur-sm px-1.5 py-1.5">
          {["Home", "Method", "Regulatory", "About"].map((l, i) => (
            <span
              key={l}
              className={cn(
                "px-4 py-1.5 rounded-full text-[13.5px] cursor-pointer transition-colors",
                i === 0 ? "bg-white/12 text-white" : "text-white/55 hover:text-white"
              )}
            >
              {l}
            </span>
          ))}
        </div>
        <button className="rounded-full bg-white/[0.07] border border-white/12 backdrop-blur-sm px-4 py-2 text-[13.5px] text-white flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" /> Get in touch
        </button>
      </div>

      <div className="relative z-10 px-8 pt-16 text-center max-w-3xl mx-auto">
        <h1 className="font-display text-[40px] md:text-[56px] leading-[1.04] tracking-[-0.03em] text-white mb-5">
          {HEADLINE.a}
          <br />
          <span className="text-white/50">{HEADLINE.b}</span>
        </h1>
        <div className="flex justify-center mb-6">
          <EmailCapture dark size="sm" />
        </div>
        <Status dark />
      </div>

      {/* ruled columns on the image */}
      <div className="relative z-10 mt-auto px-8 pb-12 max-w-6xl mx-auto w-full grid md:grid-cols-3 gap-8">
        {cols.map(([h, p], i) => (
          <div key={h}>
            <div className={cn("h-px mb-5", i === 0 ? "bg-white/60" : "bg-white/18")} />
            <p className="text-[16px] text-white leading-snug mb-2">{h}</p>
            <p className="text-[14px] text-white/45 leading-relaxed">{p}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   H4 — Dossier   (Petrarch)
   Dark editorial. A numbered section label, serif heading, a framed panel
   holding the queue, and serif-italic marginalia bleeding off the right edge.
   Treats the problem as a subject worth studying rather than a pain point to
   agitate — which suits an audience of physicians.
   ══════════════════════════════════════════════════════════════════════════ */
export function HeroDossier() {
  const rows = [
    { id: "…688.983", w: 103, t: 240, f: "Patchy opacity, left base" },
    { id: "…688.984", w: 136, t: 240, f: "Small effusion, blunted CPA" },
    { id: "…688.985", w: 182, t: 240, f: "Interstitial prominence" },
    { id: "…688.981", w: 12,  t: 30,  f: "Pneumothorax, right apical" },
  ];

  return (
    <section className="relative overflow-hidden bg-[#14140F] px-8 py-16">
      {/* marginalia */}
      <p
        className="absolute right-[-40px] top-[74px] font-editorial italic text-[30px] whitespace-nowrap select-none"
        style={{ color: "rgba(255,255,255,0.055)" }}
      >
        ordo temporis
      </p>

      <div className="relative z-10 max-w-6xl mx-auto">
        <p className="font-mono text-[12px] mb-3" style={{ color: "#7C8F6A" }}>01</p>
        <h1 className="font-editorial text-[38px] md:text-[50px] leading-[1.1] text-[#F2F0E6] mb-3 max-w-2xl">
          The queue has no sense of urgency.
        </h1>
        <p className="text-[15.5px] text-[#F2F0E6]/45 max-w-xl leading-relaxed mb-9">
          Critical findings get flagged. Routine studies are fine. Everything in between is read in
          whatever order it arrived — and that is where studies sit longest.
        </p>

        {/* framed panel */}
        <div className="rounded-sm border border-white/12 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
            <span className="font-mono text-[11px] text-white/35">medium band · waiting against a 4h target</span>
            <span className="font-mono text-[11px] text-white/25">illustrative</span>
          </div>
          <div className="p-5 space-y-3">
            {rows.map((r) => {
              const p = Math.min(100, (r.w / r.t) * 100);
              const hot = p > 70;
              return (
                <div key={r.id} className="flex items-center gap-4">
                  <span className="font-mono text-[11.5px] text-white/45 w-[68px] flex-shrink-0">{r.id}</span>
                  <span className="text-[13px] text-white/60 w-[210px] flex-shrink-0 truncate hidden sm:block">{r.f}</span>
                  <div className="flex-1 h-[3px] bg-white/10 overflow-hidden">
                    <div className="h-full" style={{ width: `${p}%`, background: hot ? "#C0432C" : "#7C8F6A" }} />
                  </div>
                  <span
                    className="font-mono text-[11.5px] tabular-nums w-[86px] text-right flex-shrink-0"
                    style={{ color: hot ? "#C0432C" : "rgba(255,255,255,0.4)" }}
                  >
                    {Math.floor(r.w / 60)}h {r.w % 60}m
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-9 flex flex-wrap items-center gap-6">
          <EmailCapture dark size="sm" />
          <Status dark />
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   H5 — Ledger Band   (Forward)
   Forward's serif statement over a three-up stat band — inverted so the numbers
   describe THE PROBLEM rather than Kroix's results. A stat band normally invites
   invented metrics; pointing it at the problem makes it honest and keeps the
   format's authority.
   ══════════════════════════════════════════════════════════════════════════ */
export function HeroLedgerBand() {
  return (
    <section className="bg-[#F2F1ED] px-8 py-16">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-editorial text-[42px] md:text-[62px] leading-[1.05] text-kx-ink text-center max-w-3xl mx-auto mb-4">
          Reading order is decided by the clock on the wall, not the one on the chart.
        </h1>
        <p className="text-[16px] text-kx-muted text-center max-w-xl mx-auto mb-12 leading-relaxed">
          {SUB}
        </p>

        <div className="grid md:grid-cols-3 border-t border-kx-border">
          {PROBLEM_STATS.map((s, i) => (
            <div
              key={s.cap}
              className={cn("py-9 px-7", i > 0 && "md:border-l border-kx-border", i > 0 && "border-t md:border-t-0 border-kx-border")}
            >
              <p className="font-editorial text-[58px] md:text-[72px] leading-[0.9] text-kx-ink">{s.n}</p>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-kx-muted mt-4 leading-relaxed">
                {s.cap}
              </p>
            </div>
          ))}
        </div>

        <div className="border-t border-kx-border pt-9 flex flex-wrap items-center justify-between gap-6">
          <EmailCapture />
          <Status />
        </div>

        <p className="font-mono text-[10.5px] text-kx-muted/70 mt-5">
          Figures describe the problem, not Kroix's performance. Kroix has not been measured against
          a without-Kroix baseline.
        </p>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   H6 — Drafting Table   (RunInfra)
   Light ground, faint drafting grid, statement left and a working panel right
   showing the queue reordering. The most product-forward of the seven and the
   only one where the visitor sees the thing itself in the fold.
   ══════════════════════════════════════════════════════════════════════════ */
export function HeroDraftingTable() {
  const [sorted, setSorted] = useState(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) { setSorted(true); return; }
    const t = setTimeout(() => setSorted(true), 1000);
    return () => clearTimeout(t);
  }, []);

  const rows = [
    { id: "…983", f: "Patchy opacity",      w: 103, t: 240 },
    { id: "…984", f: "Small effusion",      w: 136, t: 240 },
    { id: "…985", f: "Interstitial",        w: 182, t: 240 },
    { id: "…986", f: "No acute process",    w: 214, t: 1440 },
  ];
  const order = sorted ? [...rows].sort((a, b) => b.w / b.t - a.w / a.t) : rows;

  return (
    <section className="relative bg-kx-canvas px-6 py-20 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(18,21,26,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(18,21,26,0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(1000px circle at 50% 25%, black, transparent 76%)",
          WebkitMaskImage: "radial-gradient(1000px circle at 50% 25%, black, transparent 76%)",
        }}
      />

      <div className="relative z-10 max-w-[1180px] mx-auto grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kx-muted mb-5">
            Chest radiograph triage
          </p>
          <h1 className="font-display text-[40px] md:text-[52px] leading-[1.03] tracking-[-0.03em] text-kx-ink mb-5">
            {HEADLINE.a}
            <br />
            <span className="text-kx-muted">{HEADLINE.b}</span>
          </h1>
          <p className="text-[16.5px] text-kx-muted leading-relaxed max-w-md mb-8">{SUB}</p>
          <div className="mb-6"><EmailCapture /></div>
          <Status />
        </div>

        <div className="rounded-xl border border-kx-border bg-white shadow-[0_30px_70px_-40px_rgba(18,21,26,0.35)] overflow-hidden">
          <div className="px-4 py-3 border-b border-kx-border flex items-center justify-between">
            <span className="font-mono text-[11.5px] text-kx-muted">medium band</span>
            <span className="font-mono text-[11px] text-kx-muted">
              {sorted ? "by time to target" : "by arrival"}
            </span>
          </div>
          <ul className="p-2.5">
            {order.map((r) => {
              const p = Math.min(100, (r.w / r.t) * 100);
              const hot = p > 70;
              return (
                <li
                  key={r.id}
                  className="px-3 py-2.5 rounded-lg transition-colors duration-500"
                  style={{ background: sorted && hot ? "rgba(232,80,58,0.05)" : "transparent" }}
                >
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="font-mono text-[12px] text-kx-ink">{r.id}</span>
                    <span className="text-[12.5px] text-kx-muted truncate mx-3 flex-1">{r.f}</span>
                    <span
                      className="font-mono text-[12px] tabular-nums"
                      style={{ color: hot ? "#E8503A" : "#6B7280" }}
                    >
                      {p.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-kx-surface2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-700"
                      style={{ width: `${p}%`, background: hot ? "#E8503A" : "#0F9D6E" }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="px-4 py-2.5 border-t border-kx-border">
            <p className="font-mono text-[10.5px] text-kx-muted">
              Illustrative queue. Percentages are elapsed time against target.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   H7 — Split Brief   (Bento model-API page)
   A hairline two-column split giving the problem and the response equal weight,
   under small mono section labels. The most information-dense hero of the
   seven and the least emotive — closest to a technical datasheet.
   ══════════════════════════════════════════════════════════════════════════ */
export function HeroSplitBrief() {
  return (
    <section className="bg-kx-canvas px-8 py-16">
      <div className="max-w-[1180px] mx-auto">
        <h1 className="font-display text-[38px] md:text-[50px] leading-[1.05] tracking-[-0.03em] text-kx-ink text-center max-w-3xl mx-auto mb-14">
          Chest X-rays are read in the order they arrive.{" "}
          <span className="text-kx-muted">Kroix reads the clock instead.</span>
        </h1>

        <div className="grid md:grid-cols-2 border-t border-l border-kx-border">
          {/* problem */}
          <div className="border-r border-b border-kx-border p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-kx-critical mb-6">
              The problem
            </p>
            <p className="text-[19px] text-kx-ink leading-snug mb-4">
              Nothing sorts the middle of the list.
            </p>
            <p className="text-[14.5px] text-kx-muted leading-relaxed mb-7">
              Critical findings get flagged and routine studies are fine. The medium band is read
              first-in, first-out, so a study that needs a look in two hours sits behind one that
              needs a look tomorrow.
            </p>
            <ul className="space-y-0">
              {[
                ["Arrives 11:12", "read at 14:14 — 182 min into a 240 min target"],
                ["Arrives 11:58", "read at 14:14 — 136 min into the same target"],
                ["Arrives 12:31", "read at 14:14 — 103 min, and read last"],
              ].map(([a, b]) => (
                <li key={a} className="py-3 border-t border-kx-border first:border-t-0 flex items-baseline gap-3">
                  <span className="font-mono text-[12px] text-kx-ink w-[92px] flex-shrink-0">{a}</span>
                  <span className="text-[13px] text-kx-muted leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* response */}
          <div className="border-r border-b border-kx-border p-8 bg-kx-surface/50">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-kx-accent3 mb-6">
              What Kroix does
            </p>
            <p className="text-[19px] text-kx-ink leading-snug mb-4">
              Scores every study, orders by deadline.
            </p>
            <p className="text-[14.5px] text-kx-muted leading-relaxed mb-7">
              A three-model ensemble scores each chest X-ray under a second. The queue is ordered by
              how close each study is to its read-time target, and every model's contribution stays
              visible so the ranking can be argued with.
            </p>
            <ul className="space-y-0">
              {[
                ["densenet121", "0.42 weight · published, not learned per-site"],
                ["googlenet", "0.33 weight"],
                ["resnet18", "0.25 weight"],
              ].map(([a, b]) => (
                <li key={a} className="py-3 border-t border-kx-border first:border-t-0 flex items-baseline gap-3">
                  <span className="font-mono text-[12px] text-kx-ink w-[92px] flex-shrink-0">{a}</span>
                  <span className="text-[13px] text-kx-muted leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-6 pt-9">
          <EmailCapture />
          <Status />
        </div>
      </div>
    </section>
  );
}
