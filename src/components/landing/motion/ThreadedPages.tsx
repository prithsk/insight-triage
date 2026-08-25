import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollThread, segment } from "./useScrollThread";

/**
 * Five page-length landing treatments, each threaded by one continuous motif.
 *
 * DEMO ONLY. The production Landing page imports none of this.
 *
 * THE BRIEF. The Bridge's suspension bridge spans its entire page — the artwork
 * is the page's spine, not a hero decoration. These five apply that idea to
 * Kroix, where the natural spine is not a bridge but a DEADLINE: a study
 * arrives, waits, and is either read inside its window or is not. Every motif
 * below is a different way of drawing elapsed time against a target.
 *
 * That constraint is what keeps this from being decoration. The motion carries
 * the thesis — the medium band waits longest because nothing sorts it — so if
 * you removed the animation you would lose an argument, not a flourish.
 *
 * MOTION DISCIPLINE (frontend-design + ui-ux-pro-max §7):
 *  - One motif per page. Boldness spent in a single place; everything else quiet.
 *  - Continuous scroll-linked transforms only on decorative layers, never on
 *    body copy — parallaxed text hurts reading and triggers motion sickness.
 *  - prefers-reduced-motion returns the end state and attaches no listener.
 *  - Transforms and opacity only. No width/height animation, no layout thrash.
 *
 * HONESTY. No performance claim, no outcome claim, no comparison against
 * not-Kroix. Numbers describe the problem's shape and are labelled illustrative.
 */

/* ── shared content ──────────────────────────────────────────────────────── */

const COPY = {
  eyebrow: "Chest radiograph triage",
  h1a: "The worklist reads in arrival order.",
  h1b: "Patients don't arrive in order of need.",
  sub: "Kroix scores every chest X-ray as it lands and reorders the queue by how close each study is to its read-time target.",
  status: "Pre-clearance · in validation · not for clinical use",
};

const SECTIONS = [
  {
    n: "01",
    label: "The gap",
    head: "Nothing sorts the middle of the list.",
    body: "Critical findings get flagged. Routine studies are fine. Everything in between is read first-in, first-out — so a study that needs a look in two hours waits behind one that needs a look tomorrow.",
  },
  {
    n: "02",
    label: "The response",
    head: "Order by the deadline, not the arrival.",
    body: "A three-model ensemble scores each study in under a second. The queue is ranked by elapsed time against the read-time target, so the study closest to breaching surfaces first.",
  },
  {
    n: "03",
    label: "The receipt",
    head: "Every score can be argued with.",
    body: "Three models, published weights, each contribution visible. A radiologist disagrees with densenet121 at 0.96 — not with 'the AI'. Disagreement is recorded against the model that earned it.",
  },
  {
    n: "04",
    label: "The limit",
    head: "What we have not proven.",
    body: "Kroix has never been measured against not using Kroix. Whether reordering brings studies inside their targets is an open question, and answering it needs a department's historical worklist replayed with throughput held fixed.",
  },
];

/** Illustrative queue. Waited vs target, in minutes. */
const QUEUE = [
  { id: "…983", f: "Patchy opacity, left base",   w: 103, t: 240 },
  { id: "…984", f: "Small effusion",              w: 136, t: 240 },
  { id: "…985", f: "Interstitial prominence",     w: 182, t: 240 },
  { id: "…981", f: "Pneumothorax, right apical",  w: 12,  t: 30  },
  { id: "…986", f: "No acute process",            w: 214, t: 1440 },
];

const MODELS = [
  { name: "densenet121", w: 0.42 },
  { name: "googlenet", w: 0.33 },
  { name: "resnet18", w: 0.25 },
];

/* ── shared primitives ───────────────────────────────────────────────────── */

function Capture({ tone }: { tone: "warm" | "dark" | "light" }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const dark = tone === "dark";

  if (done) {
    return (
      <p className={cn("text-[15px] font-medium", dark ? "text-emerald-400" : "text-kx-accent3")}>
        You're on the list.
      </p>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setDone(true); // demo only — the live form writes to waitlist_signups
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2.5 max-w-md">
      <label className="sr-only" htmlFor={`cap-${tone}`}>Email</label>
      <input
        id={`cap-${tone}`}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@hospital.org"
        className={cn(
          "flex-1 min-w-[190px] rounded-full px-5 py-3 text-[15px] border focus:outline-none transition-colors",
          dark
            ? "bg-white/8 border-white/20 text-white placeholder:text-white/35 focus:border-white/50"
            : "bg-white/90 border-black/12 text-[#1A1D21] placeholder:text-black/30 focus:border-black/40"
        )}
      />
      <button
        type="submit"
        className={cn(
          "rounded-full px-6 py-3 text-[15px] font-medium flex items-center gap-2 transition-opacity hover:opacity-90",
          dark ? "bg-white text-[#0E1216]" : "bg-[#1A1D21] text-white"
        )}
      >
        Join the waitlist <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}

/** Section shell. Copy never moves with scroll — only the motif does. */
function Band({
  children,
  className,
  minH = "min-h-[92vh]",
}: {
  children: ReactNode;
  className?: string;
  minH?: string;
}) {
  return (
    <section className={cn("relative flex items-center px-6 md:px-10", minH, className)}>
      <div className="relative z-10 w-full max-w-[1180px] mx-auto">{children}</div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   M1 — DECK   (The Bridge, pixel-art)

   A pixel suspension deck spans the whole page. Its cable sags and rises with
   scroll, and a single study rides across it left to right — arriving at one
   end of the page and being read at the other. The horizontal traveller is the
   literal answer to "something moves across everything".

   Palette taken from the reference: cream ground, rust structure, sage accent.
   ══════════════════════════════════════════════════════════════════════════ */
export function ThreadDeck() {
  const { ref, progress } = useScrollThread();
  const x = progress * 100;
  const sag = Math.sin(progress * Math.PI) * 26; // deck dips in the middle

  return (
    <div ref={ref} className="relative" style={{ background: "#EFEDDC", color: "#1E1B12" }}>
      {/* fixed pixel sky */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {[
          { top: "12%", left: "8%", w: 104 },
          { top: "26%", left: "72%", w: 138 },
          { top: "54%", left: "34%", w: 84 },
          { top: "72%", left: "62%", w: 116 },
        ].map((c, i) => (
          <div key={i} className="absolute" style={{ top: c.top, left: c.left, opacity: 0.75 }}>
            <div style={{ width: c.w, height: 14, background: "#FFFFFF" }} />
            <div style={{ width: c.w * 0.62, height: 12, background: "#FFFFFF", marginLeft: c.w * 0.2 }} />
          </div>
        ))}
        <div
          className="absolute"
          style={{
            top: "9%", left: "24%", width: 56, height: 56,
            background: "#F2C14E", boxShadow: "0 0 50px 24px rgba(242,193,78,0.26)",
          }}
        />
      </div>

      {/* the deck — fixed to the viewport, redrawn by scroll */}
      <div className="fixed left-0 right-0 pointer-events-none z-[1]" style={{ bottom: "13vh" }}>
        <div className="relative h-[130px]">
          {/* cable */}
          <svg className="absolute inset-x-0 top-0 w-full h-[86px]" preserveAspectRatio="none" viewBox="0 0 1000 86">
            <path
              d={`M0,10 Q500,${10 + sag * 2.4} 1000,10`}
              fill="none"
              stroke="#C0432C"
              strokeWidth="4"
            />
          </svg>
          {/* hangers */}
          <div className="absolute inset-x-0 top-0 flex justify-between px-[3%]">
            {Array.from({ length: 34 }).map((_, i) => {
              const t = i / 33;
              const drop = 10 + Math.sin(t * Math.PI) * sag * 2.4;
              return (
                <div key={i} style={{ width: 2, height: 86 - drop, marginTop: drop, background: "rgba(192,67,44,0.5)" }} />
              );
            })}
          </div>
          {/* deck */}
          <div className="absolute inset-x-0 top-[86px]" style={{ height: 9, background: "#C0432C" }} />
          {/* towers */}
          <div className="absolute" style={{ left: "6%", top: -34, width: 11, height: 129, background: "#A8371F" }} />
          <div className="absolute" style={{ right: "6%", top: -34, width: 11, height: 129, background: "#A8371F" }} />

          {/* the study, riding across */}
          <div
            className="absolute"
            style={{ left: `calc(${x}% - 14px)`, top: 62, transition: "left 90ms linear" }}
          >
            <div style={{ width: 26, height: 32, background: progress > 0.55 ? "#7C8F6A" : "#1E1B12" }}>
              <div style={{ height: 5, background: "rgba(255,255,255,0.35)" }} />
            </div>
            <p className="font-mono text-[9px] mt-1 whitespace-nowrap" style={{ color: "#8A8467" }}>
              {progress > 0.55 ? "read" : "waiting"}
            </p>
          </div>
        </div>
      </div>

      {/* content */}
      <Band minH="min-h-screen">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] mb-6" style={{ color: "#8A8467" }}>
            {COPY.eyebrow}
          </p>
          <h1 className="font-editorial text-[42px] md:text-[62px] leading-[1.06] mb-6">
            {COPY.h1a}
            <br />
            Patients don't arrive in <em>order of need.</em>
          </h1>
          <p className="font-mono text-[13.5px] leading-relaxed max-w-lg mb-9" style={{ color: "#6E6853" }}>
            {COPY.sub}
          </p>
          <Capture tone="warm" />
        </div>
      </Band>

      {SECTIONS.map((s, i) => (
        <Band key={s.n}>
          <div className={cn("max-w-xl", i % 2 === 1 && "ml-auto")}>
            <p className="font-mono text-[11px] tracking-[0.2em] mb-4" style={{ color: "#C0432C" }}>
              {s.n} — {s.label.toUpperCase()}
            </p>
            <h2 className="font-editorial text-[32px] md:text-[42px] leading-[1.1] mb-5">{s.head}</h2>
            <p className="font-mono text-[13px] leading-[1.85]" style={{ color: "#6E6853" }}>{s.body}</p>
          </div>
        </Band>
      ))}

      <Band minH="min-h-[80vh]">
        <div className="max-w-xl">
          <h2 className="font-editorial text-[34px] md:text-[46px] leading-[1.08] mb-6">
            We'll share what the measurements show — <em>including if they show nothing.</em>
          </h2>
          <Capture tone="warm" />
          <p className="font-mono text-[11px] mt-8" style={{ color: "#8A8467" }}>{COPY.status}</p>
        </div>
      </Band>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   M2 — PLAYHEAD   (line art, clinical)

   A vertical time spine down the left edge, marked at the real SLA windows.
   A playhead descends it as you scroll and the study's bar fills behind it;
   past the 4h mark the whole spine turns red. The page IS the wait.

   The one motif where scroll position means something literal: distance down
   the page equals elapsed time.
   ══════════════════════════════════════════════════════════════════════════ */
export function ThreadPlayhead() {
  const { ref, progress } = useScrollThread();
  const breached = progress > 0.74;
  const marks = [
    { at: 0.06, label: "arrives" },
    { at: 0.26, label: "30m · critical target" },
    { at: 0.74, label: "4h · review target" },
    { at: 0.95, label: "24h · routine target" },
  ];

  return (
    <div ref={ref} className="relative" style={{ background: "#FAFAF8", color: "#1A1D21" }}>
      {/* spine */}
      <div className="fixed left-6 md:left-12 top-0 bottom-0 w-px z-[1] pointer-events-none" style={{ background: "rgba(26,29,33,0.12)" }}>
        <div
          className="absolute left-0 top-0 w-px"
          style={{
            height: `${progress * 100}%`,
            background: breached ? "#C0392B" : "#0F9D6E",
            transition: "background-color 400ms ease",
          }}
        />
        {marks.map((m) => (
          <div key={m.label} className="absolute -left-[3px]" style={{ top: `${m.at * 100}%` }}>
            <div className="w-[7px] h-[7px] rounded-full" style={{ background: progress >= m.at ? (breached ? "#C0392B" : "#0F9D6E") : "rgba(26,29,33,0.2)" }} />
            <span
              className="absolute left-4 top-[-5px] font-mono text-[10px] whitespace-nowrap"
              style={{ color: progress >= m.at ? "rgba(26,29,33,0.6)" : "rgba(26,29,33,0.25)" }}
            >
              {m.label}
            </span>
          </div>
        ))}
        {/* playhead */}
        <div
          className="absolute -left-[9px] w-[19px] h-[19px] rounded-full border-2 flex items-center justify-center"
          style={{
            top: `calc(${progress * 100}% - 9px)`,
            borderColor: breached ? "#C0392B" : "#0F9D6E",
            background: "#FAFAF8",
          }}
        >
          <div className="w-[6px] h-[6px] rounded-full" style={{ background: breached ? "#C0392B" : "#0F9D6E" }} />
        </div>
      </div>

      {/* running readout, top right */}
      <div className="fixed right-6 md:right-12 top-8 z-[1] text-right pointer-events-none">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em]" style={{ color: "rgba(26,29,33,0.35)" }}>
          study …985 · elapsed
        </p>
        <p
          className="font-mono text-[30px] tabular-nums leading-none mt-1"
          style={{ color: breached ? "#C0392B" : "#1A1D21" }}
        >
          {Math.round(progress * 4 * 60)}m
        </p>
        <p className="font-mono text-[10.5px] mt-1" style={{ color: breached ? "#C0392B" : "rgba(26,29,33,0.35)" }}>
          {breached ? "target missed" : "of 240m target"}
        </p>
      </div>

      <div className="pl-14 md:pl-28 pr-6">
        <Band minH="min-h-screen">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] mb-6" style={{ color: "rgba(26,29,33,0.4)" }}>
              {COPY.eyebrow}
            </p>
            <h1 className="font-display text-[42px] md:text-[60px] leading-[1.02] tracking-[-0.032em] mb-6">
              {COPY.h1a}
              <br />
              <span style={{ color: "rgba(26,29,33,0.4)" }}>{COPY.h1b}</span>
            </h1>
            <p className="text-[17px] leading-relaxed max-w-lg mb-9" style={{ color: "rgba(26,29,33,0.55)" }}>
              {COPY.sub}
            </p>
            <Capture tone="light" />
          </div>
        </Band>

        {SECTIONS.map((s) => (
          <Band key={s.n}>
            <div className="max-w-xl">
              <p className="font-mono text-[11px] tracking-[0.16em] mb-4" style={{ color: "rgba(26,29,33,0.35)" }}>
                {s.n} / {s.label}
              </p>
              <h2 className="font-display text-[30px] md:text-[40px] leading-[1.1] tracking-[-0.025em] mb-5">{s.head}</h2>
              <p className="text-[16px] leading-[1.75]" style={{ color: "rgba(26,29,33,0.58)" }}>{s.body}</p>
            </div>
          </Band>
        ))}

        <Band minH="min-h-[80vh]">
          <div className="max-w-xl">
            <h2 className="font-display text-[32px] md:text-[44px] leading-[1.06] tracking-[-0.03em] mb-6">
              That study waited four hours. Nothing in the queue noticed.
            </h2>
            <Capture tone="light" />
            <p className="font-mono text-[11px] mt-8" style={{ color: "rgba(26,29,33,0.35)" }}>{COPY.status}</p>
          </div>
        </Band>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   M3 — CONVEYOR   (horizontal against vertical)

   A filmstrip of studies runs along the bottom, translating left as you scroll
   down, with a fixed reticle at centre marking the study "currently being
   read". Vertical input, horizontal output — the most direct reading of the
   request, and it makes the queue feel like a physical belt you cannot speed up.
   ══════════════════════════════════════════════════════════════════════════ */
export function ThreadConveyor() {
  const { ref, progress } = useScrollThread();
  const strip = [...QUEUE, ...QUEUE, ...QUEUE];
  const shift = progress * (strip.length * 122 - 600);

  return (
    <div ref={ref} className="relative" style={{ background: "#EDEAE4", color: "#191A1C" }}>
      {/* belt */}
      <div className="fixed left-0 right-0 bottom-0 h-[156px] z-[1] pointer-events-none" style={{ background: "#E4E0D8", borderTop: "1px solid rgba(25,26,28,0.1)" }}>
        <div className="relative h-full overflow-hidden">
          <div
            className="absolute top-5 flex gap-3"
            style={{ transform: `translateX(${-shift}px)`, willChange: "transform" }}
          >
            {strip.map((s, i) => {
              const p = Math.min(100, (s.w / s.t) * 100);
              const hot = p > 70;
              return (
                <div
                  key={i}
                  className="flex-shrink-0 w-[110px] rounded-sm"
                  style={{ background: "#FBFAF7", border: "1px solid rgba(25,26,28,0.1)" }}
                >
                  <div className="h-[54px] grid place-items-center" style={{ background: "rgba(25,26,28,0.05)" }}>
                    <span className="font-mono text-[9.5px]" style={{ color: "rgba(25,26,28,0.35)" }}>CXR</span>
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="font-mono text-[10px]">{s.id}</p>
                    <div className="h-[3px] mt-1 rounded-full" style={{ background: "rgba(25,26,28,0.1)" }}>
                      <div className="h-full rounded-full" style={{ width: `${p}%`, background: hot ? "#C0392B" : "#0F9D6E" }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* belt teeth */}
          <div className="absolute bottom-0 inset-x-0 h-3 flex gap-2 overflow-hidden" style={{ transform: `translateX(${-shift * 0.4}px)` }}>
            {Array.from({ length: 200 }).map((_, i) => (
              <div key={i} className="flex-shrink-0" style={{ width: 10, height: 12, background: "rgba(25,26,28,0.09)" }} />
            ))}
          </div>
        </div>

        {/* fixed reticle */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[118px] pointer-events-none" style={{ border: "1px solid rgba(192,57,43,0.55)" }}>
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[9.5px] whitespace-nowrap" style={{ color: "#C0392B" }}>
            being read
          </span>
        </div>
      </div>

      <div className="pb-[176px]">
        <Band minH="min-h-screen">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] mb-6" style={{ color: "rgba(25,26,28,0.4)" }}>
              {COPY.eyebrow}
            </p>
            <h1 className="font-display text-[42px] md:text-[60px] leading-[1.02] tracking-[-0.032em] mb-6">
              The belt moves at one speed.
              <br />
              <span style={{ color: "rgba(25,26,28,0.42)" }}>Only the order is yours to choose.</span>
            </h1>
            <p className="text-[17px] leading-relaxed max-w-lg mb-9" style={{ color: "rgba(25,26,28,0.55)" }}>
              {COPY.sub}
            </p>
            <Capture tone="light" />
          </div>
        </Band>

        {SECTIONS.map((s) => (
          <Band key={s.n} minH="min-h-[86vh]">
            <div className="max-w-xl">
              <p className="font-mono text-[11px] tracking-[0.16em] mb-4" style={{ color: "#C0392B" }}>
                {s.n} · {s.label}
              </p>
              <h2 className="font-display text-[30px] md:text-[40px] leading-[1.1] tracking-[-0.025em] mb-5">{s.head}</h2>
              <p className="text-[16px] leading-[1.75]" style={{ color: "rgba(25,26,28,0.58)" }}>{s.body}</p>
            </div>
          </Band>
        ))}

        <Band minH="min-h-[70vh]">
          <div className="max-w-xl">
            <h2 className="font-display text-[32px] md:text-[44px] leading-[1.06] tracking-[-0.03em] mb-6">
              Same belt. Same speed. Different order.
            </h2>
            <Capture tone="light" />
            <p className="font-mono text-[11px] mt-8" style={{ color: "rgba(25,26,28,0.4)" }}>{COPY.status}</p>
          </div>
        </Band>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   M4 — TRACE   (line art, monitor)

   One continuous polyline drawn down the full page, revealed by scroll via
   stroke-dashoffset. It runs flat while nothing sorts the queue, spikes where
   the critical study appears, and settles into an even rhythm after the
   reorder. Phosphor amber on slate — a monitor, not a dashboard.
   ══════════════════════════════════════════════════════════════════════════ */
export function ThreadTrace() {
  const { ref, progress } = useScrollThread();

  // A vertical waveform: flat, spike, settle. Drawn once, revealed by scroll.
  const pts: string[] = [];
  const H = 2400;
  for (let i = 0; i <= 240; i++) {
    const t = i / 240;
    const y = t * H;
    let x = 50;
    if (t < 0.34) x = 50 + Math.sin(t * 40) * 2;                     // flat, barely alive
    else if (t < 0.46) x = 50 + Math.sin((t - 0.34) * 52) * 46;      // the spike
    else x = 50 + Math.sin(t * 26) * 13 * (1 - (t - 0.46));          // settling rhythm
    pts.push(`${x.toFixed(1)},${y.toFixed(0)}`);
  }
  const path = `M${pts.join(" L")}`;
  const LEN = 3400;

  return (
    <div ref={ref} className="relative" style={{ background: "#0E1216", color: "#E8EAED" }}>
      {/* monitor line */}
      <div className="fixed inset-y-0 left-0 w-[120px] md:w-[190px] z-[1] pointer-events-none">
        <svg viewBox="0 0 100 2400" preserveAspectRatio="none" className="w-full h-full">
          <path d={path} fill="none" stroke="rgba(232,163,61,0.12)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
          <path
            d={path}
            fill="none"
            stroke="#E8A33D"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeDasharray={LEN}
            strokeDashoffset={LEN * (1 - progress)}
            style={{ filter: "drop-shadow(0 0 6px rgba(232,163,61,0.55))" }}
          />
        </svg>
        <div
          className="absolute left-0 right-0 h-px"
          style={{ top: `${progress * 100}%`, background: "rgba(232,163,61,0.35)" }}
        />
      </div>

      <div className="pl-[130px] md:pl-[220px] pr-6">
        <Band minH="min-h-screen">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] mb-6" style={{ color: "rgba(232,163,61,0.7)" }}>
              {COPY.eyebrow}
            </p>
            <h1 className="font-display text-[42px] md:text-[58px] leading-[1.02] tracking-[-0.032em] mb-6">
              {COPY.h1a}
              <br />
              <span style={{ color: "rgba(232,234,237,0.42)" }}>{COPY.h1b}</span>
            </h1>
            <p className="text-[17px] leading-relaxed max-w-lg mb-9" style={{ color: "rgba(232,234,237,0.5)" }}>
              {COPY.sub}
            </p>
            <Capture tone="dark" />
          </div>
        </Band>

        {SECTIONS.map((s) => (
          <Band key={s.n}>
            <div className="max-w-xl">
              <p className="font-mono text-[11px] tracking-[0.18em] mb-4" style={{ color: "rgba(232,163,61,0.75)" }}>
                {s.n} — {s.label.toUpperCase()}
              </p>
              <h2 className="font-display text-[30px] md:text-[40px] leading-[1.1] tracking-[-0.025em] mb-5">{s.head}</h2>
              <p className="text-[16px] leading-[1.78]" style={{ color: "rgba(232,234,237,0.5)" }}>{s.body}</p>

              {s.n === "03" && (
                <div className="mt-8 space-y-2 max-w-sm">
                  {MODELS.map((m) => (
                    <div key={m.name} className="flex items-center gap-3">
                      <span className="font-mono text-[11px] w-[86px]" style={{ color: "rgba(232,234,237,0.45)" }}>{m.name}</span>
                      <div className="flex-1 h-px" style={{ background: "rgba(232,234,237,0.14)" }}>
                        <div className="h-px" style={{ width: `${m.w * 100 * 2.2}%`, background: "#E8A33D" }} />
                      </div>
                      <span className="font-mono text-[11px] tabular-nums" style={{ color: "rgba(232,234,237,0.45)" }}>{m.w}</span>
                    </div>
                  ))}
                  <p className="font-mono text-[10px] pt-2" style={{ color: "rgba(232,234,237,0.28)" }}>
                    Fusion weights, published — not learned per site.
                  </p>
                </div>
              )}
            </div>
          </Band>
        ))}

        <Band minH="min-h-[80vh]">
          <div className="max-w-xl">
            <h2 className="font-display text-[32px] md:text-[44px] leading-[1.06] tracking-[-0.03em] mb-6">
              We'll publish the result either way.
            </h2>
            <Capture tone="dark" />
            <p className="font-mono text-[11px] mt-8" style={{ color: "rgba(232,234,237,0.35)" }}>{COPY.status}</p>
          </div>
        </Band>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   M5 — STACK   (physical, vertical reorder)

   A stack of film jackets pinned at the right edge. Scroll pulls the stack
   apart and the urgent study climbs from fifth place to first, then the stack
   closes again in its new order. The only motif where the reordering itself is
   the animation rather than a side effect of it.
   ══════════════════════════════════════════════════════════════════════════ */
export function ThreadStack() {
  const { ref, progress } = useScrollThread();
  const spread = segment(progress, 0.12, 0.5);     // fan out
  const reorder = segment(progress, 0.42, 0.72);   // urgent rises
  const close = segment(progress, 0.74, 0.95);     // settle

  return (
    <div ref={ref} className="relative" style={{ background: "#F4F2EC", color: "#17181A" }}>
      <div className="fixed right-8 md:right-16 top-1/2 -translate-y-1/2 z-[1] pointer-events-none hidden md:block">
        <div className="relative w-[150px] h-[300px]">
          {QUEUE.map((s, i) => {
            const isUrgent = s.id === "…981";
            const base = i * 8;
            const fanned = i * 52 * spread;
            // The urgent jacket travels to the top slot as `reorder` runs.
            const target = isUrgent ? -base - fanned + (0 - (i * 52)) * reorder : fanned;
            const y = base + target * 1 - close * fanned * 0.82;
            const rot = (i - 2) * 1.6 * spread * (1 - close);
            const p = Math.min(100, (s.w / s.t) * 100);
            return (
              <div
                key={s.id}
                className="absolute left-0 right-0 rounded-sm"
                style={{
                  top: y,
                  zIndex: isUrgent ? 50 : 10 - i,
                  transform: `rotate(${rot}deg)`,
                  background: "#FCFBF8",
                  border: `1px solid ${isUrgent && reorder > 0.15 ? "rgba(192,57,43,0.55)" : "rgba(23,24,26,0.12)"}`,
                  boxShadow: "0 8px 22px -14px rgba(23,24,26,0.4)",
                  transition: "border-color 300ms ease",
                }}
              >
                <div className="px-3 py-2.5">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="font-mono text-[10.5px]">{s.id}</span>
                    <span
                      className="font-mono text-[10px] tabular-nums"
                      style={{ color: p > 70 ? "#C0392B" : "rgba(23,24,26,0.4)" }}
                    >
                      {p.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-[10.5px] truncate" style={{ color: "rgba(23,24,26,0.45)" }}>{s.f}</p>
                  <div className="h-[3px] mt-2 rounded-full" style={{ background: "rgba(23,24,26,0.09)" }}>
                    <div className="h-full rounded-full" style={{ width: `${p}%`, background: p > 70 ? "#C0392B" : "#0F9D6E" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="font-mono text-[10px] mt-5 text-center" style={{ color: "rgba(23,24,26,0.32)" }}>
          {reorder > 0.6 ? "ordered by time to target" : "ordered by arrival"}
        </p>
      </div>

      <div className="md:pr-[230px]">
        <Band minH="min-h-screen">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] mb-6" style={{ color: "rgba(23,24,26,0.4)" }}>
              {COPY.eyebrow}
            </p>
            <h1 className="font-display text-[42px] md:text-[60px] leading-[1.02] tracking-[-0.032em] mb-6">
              {COPY.h1a}
              <br />
              <span style={{ color: "rgba(23,24,26,0.42)" }}>{COPY.h1b}</span>
            </h1>
            <p className="text-[17px] leading-relaxed max-w-lg mb-9" style={{ color: "rgba(23,24,26,0.55)" }}>
              {COPY.sub}
            </p>
            <Capture tone="light" />
          </div>
        </Band>

        {SECTIONS.map((s) => (
          <Band key={s.n}>
            <div className="max-w-xl">
              <p className="font-mono text-[11px] tracking-[0.16em] mb-4" style={{ color: "rgba(23,24,26,0.35)" }}>
                {s.n} · {s.label}
              </p>
              <h2 className="font-display text-[30px] md:text-[40px] leading-[1.1] tracking-[-0.025em] mb-5">{s.head}</h2>
              <p className="text-[16px] leading-[1.75]" style={{ color: "rgba(23,24,26,0.58)" }}>{s.body}</p>
            </div>
          </Band>
        ))}

        <Band minH="min-h-[80vh]">
          <div className="max-w-xl">
            <h2 className="font-display text-[32px] md:text-[44px] leading-[1.06] tracking-[-0.03em] mb-6">
              The stack is the same size. The top of it isn't.
            </h2>
            <Capture tone="light" />
            <p className="font-mono text-[11px] mt-8" style={{ color: "rgba(23,24,26,0.4)" }}>{COPY.status}</p>
          </div>
        </Band>
      </div>
    </div>
  );
}
