import { ReactNode, useEffect, useRef, useState } from "react";

/**
 * A2b — Horizontal rising staircase.
 *
 * The same "it builds as you go" idea from AboutLayerStack, rotated: five
 * moments in the life of a single study, climbing left-to-right. Deliberately
 * different cards from the architecture version — this one is a timeline that
 * argues from a concrete case, not a diagram of the system.
 */

interface Moment {
  time: string;
  name: string;
  line: string;
  accent: string;
  visual: (on: boolean) => ReactNode;
}

const MOMENTS: Moment[] = [
  {
    time: "07:41:02",
    name: "Acquired",
    line: "A portable chest film is shot in ER-3 and pushed to the worklist. It carries a timestamp and a location — nothing about how sick this patient is.",
    accent: "#6B7280",
    visual: (on) => (
      <div className="rounded-lg border border-kx-border bg-kx-surface p-3">
        <div
          className="h-14 rounded bg-gradient-to-b from-kx-ink/20 to-kx-ink/5 mb-2 transition-opacity duration-700"
          style={{ opacity: on ? 1 : 0.2 }}
        />
        <p className="font-mono text-[9px] text-kx-muted truncate">C48D02 · ER-3 · portable AP</p>
      </div>
    ),
  },
  {
    time: "07:41:03",
    name: "Scored",
    line: "Three models read it in parallel. Their outputs fuse to a single number: 0.86. That took under a second, and nobody had to ask for it.",
    accent: "#3B5BFF",
    visual: (on) => (
      <div className="space-y-1.5">
        {([["densenet121", 88], ["googlenet", 85], ["resnet18", 79]] as [string, number][]).map(
          ([n, v], i) => (
            <div key={n} className="flex items-center gap-2">
              <span className="font-mono text-[8px] w-[58px] text-kx-muted truncate">{n}</span>
              <div className="flex-1 h-1 rounded-full bg-kx-surface2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-kx-accent2 transition-[width] duration-700 ease-out"
                  style={{ width: on ? `${v}%` : "0%", transitionDelay: `${i * 100}ms` }}
                />
              </div>
            </div>
          )
        )}
        <p className="font-mono text-[13px] text-kx-accent2 pt-1">0.86 fused</p>
      </div>
    ),
  },
  {
    time: "07:41:03",
    name: "Ranked",
    line: "It was fifth in line. It is now first. The four studies ahead of it were routine, and the queue worked that out on its own.",
    accent: "#0F9D6E",
    visual: (on) => (
      <div className="flex items-center gap-3 py-4">
        <div className="text-center">
          <p className="font-mono text-[26px] text-kx-muted/40 leading-none">5</p>
          <p className="font-mono text-[7px] text-kx-muted mt-1">was</p>
        </div>
        <div
          className="flex-1 h-px bg-kx-accent3 transition-transform duration-700 origin-left"
          style={{ transform: on ? "scaleX(1)" : "scaleX(0)" }}
        />
        <div className="text-center">
          <p
            className="font-mono text-[26px] text-kx-accent3 leading-none transition-opacity duration-500"
            style={{ opacity: on ? 1 : 0, transitionDelay: "500ms" }}
          >
            1
          </p>
          <p className="font-mono text-[7px] text-kx-muted mt-1">now</p>
        </div>
      </div>
    ),
  },
  {
    time: "07:43:18",
    name: "Opened",
    line: "The radiologist opens it to a Grad-CAM overlay already rendered. The evidence arrives with the flag, so the call can be checked rather than trusted.",
    accent: "#E8503A",
    visual: (on) => (
      <div className="relative h-[72px] rounded-lg overflow-hidden bg-kx-ink/80">
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            opacity: on ? 1 : 0,
            background:
              "radial-gradient(closest-side at 40% 45%, rgba(232,80,58,0.85), rgba(232,80,58,0.3) 55%, transparent 72%)",
          }}
        />
        <span className="absolute bottom-1.5 left-2 font-mono text-[7px] uppercase tracking-wider text-white/80">
          right lower lobe
        </span>
      </div>
    ),
  },
  {
    time: "07:46:55",
    name: "Signed",
    line: "Dr. Chen confirms. That signature — not the model score — is what enters the record. Kroix decided what got looked at first, and nothing else.",
    accent: "#C89F65",
    visual: (on) => (
      <div className="space-y-2 py-3">
        <div
          className="text-center font-mono text-[10px] py-2 rounded bg-emerald-500 text-white transition-all duration-500"
          style={{ opacity: on ? 1 : 0.25, transform: on ? "none" : "scale(0.96)" }}
        >
          Confirmed
        </div>
        <p
          className="font-mono text-[8px] text-kx-muted text-center transition-opacity duration-700"
          style={{ opacity: on ? 1 : 0, transitionDelay: "350ms" }}
        >
          Dr. Chen · audit #4471
        </p>
      </div>
    ),
  },
];

export function AboutStaircase() {
  const [active, setActive] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActive(MOMENTS.length - 1);
      return;
    }
    const t = setInterval(() => {
      if (!paused.current) setActive((a) => (a + 1) % MOMENTS.length);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative py-28 md:py-36 px-6 bg-kx-tint3 overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.6]"
        style={{
          background:
            "radial-gradient(800px circle at 15% 15%, rgba(200,159,101,0.10), transparent 58%), radial-gradient(900px circle at 90% 85%, rgba(15,157,110,0.10), transparent 60%)",
        }}
      />
      <div className="relative z-10 max-w-6xl mx-auto">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-kx-muted mb-3">
          One study, five minutes
        </p>
        <h2 className="font-display text-[32px] md:text-[46px] leading-[1.05] tracking-[-0.03em] text-kx-ink max-w-2xl mb-4">
          C48D02 arrived fifth and was read first.
        </h2>
        <p className="text-[15px] text-kx-muted max-w-xl mb-8">
          Every step below happened without anyone asking for it. Hover to follow the study across.
        </p>

        {/* rising staircase — each moment sits higher than the one before it */}
        <div className="flex gap-3 md:gap-4 items-end pt-32 pb-6 -mx-2 px-2 overflow-x-auto">
          {MOMENTS.map((m, i) => {
            const isActive = i === active;
            const reached = i <= active;
            return (
              <button
                key={m.name}
                onMouseEnter={() => {
                  paused.current = true;
                  setActive(i);
                }}
                onMouseLeave={() => (paused.current = false)}
                onFocus={() => {
                  // Mirror the mouse pause. Without this, a keyboard user who
                  // tabs to a step has the auto-advance move the panel out from
                  // under them while their focus stays put.
                  paused.current = true;
                  setActive(i);
                }}
                onBlur={() => (paused.current = false)}
                className="group relative flex-1 min-w-[172px] text-left rounded-2xl border bg-white p-4 md:p-5 transition-all duration-[550ms] ease-out"
                style={{
                  transform: `translateY(${-i * 24 - (isActive ? 20 : 0)}px)`,
                  borderColor: reached ? `${m.accent}66` : "rgba(18,21,26,0.08)",
                  boxShadow: isActive
                    ? `0 28px 60px -22px ${m.accent}80`
                    : "0 10px 26px -18px rgba(18,21,26,0.30)",
                  opacity: reached ? 1 : 0.45,
                }}
              >
                {/* connector to the next step */}
                {i < MOMENTS.length - 1 && (
                  <span
                    className="hidden md:block absolute top-1/2 -right-4 w-4 h-px transition-colors duration-500"
                    style={{ background: reached ? `${m.accent}55` : "rgba(18,21,26,0.10)" }}
                  />
                )}

                <div className="flex items-baseline justify-between mb-3">
                  <span className="font-display text-[16px] font-medium text-kx-ink">{m.name}</span>
                  <span className="font-mono text-[9px] text-kx-muted">{m.time}</span>
                </div>

                <div className="min-h-[86px] mb-3">{m.visual(reached)}</div>

                <p
                  className="text-[12.5px] leading-relaxed text-kx-muted transition-all duration-500 overflow-hidden"
                  style={{ maxHeight: isActive ? 140 : 0, opacity: isActive ? 1 : 0 }}
                >
                  {m.line}
                </p>

                <span
                  className="absolute left-0 bottom-0 h-[3px] rounded-b-2xl transition-all duration-500"
                  style={{ width: isActive ? "100%" : "0%", background: m.accent }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
