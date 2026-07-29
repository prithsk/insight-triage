import { ReactNode, useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/ui/reveal";

/**
 * Five candidate "what Kroix is" sections, to replace the scroll-lit sentence.
 * Each states the company in a line rather than a slogan, per the Harvey/Legora
 * reference set. Pick one; the rest can be deleted.
 */

/* ────────────────────────────────────────────────────────────
   A1 — Cycling capability list (Harvey)
   A quiet left-hand lead-in, a vertical stack of capabilities where the
   active one is inked and the rest fall away in grey.
   ──────────────────────────────────────────────────────────── */

const CAPABILITIES = [
  "Worklist Triage",
  "Urgency Scoring",
  "Grad-CAM Explanations",
  "Ensemble Inference",
  "Turnaround Analytics",
  "Radiologist Sign-off",
];

export function AboutWordCycle() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setActive((a) => (a + 1) % CAPABILITIES.length), 1900);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="py-28 md:py-36 px-6 bg-kx-surface">
      <div className="max-w-6xl mx-auto grid md:grid-cols-[220px_1fr_180px] gap-10 md:gap-14 items-center">
        <p className="font-display text-[15px] font-medium text-kx-ink leading-snug">
          Radiology teams
          <br />
          use Kroix for
        </p>

        <div className="space-y-1">
          {CAPABILITIES.map((c, i) => (
            <p
              key={c}
              className={`font-editorial text-[34px] md:text-[52px] leading-[1.14] transition-all duration-700 ${
                i === active ? "text-kx-ink" : "text-kx-ink/[0.14]"
              }`}
            >
              {c}
            </p>
          ))}
        </div>

        <div className="md:justify-self-end">
          <a
            href="/dashboard"
            className="inline-block px-5 py-2.5 border border-kx-border rounded-full text-[13px] font-medium text-kx-ink hover:border-kx-ink/40 transition-colors whitespace-nowrap"
          >
            Explore the platform
          </a>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   A2 — Progressive architecture stack
   The stack builds as you go down the rail: hovering a layer doesn't just
   highlight it, it *adds* it on top of everything beneath. Reading top-to-bottom
   assembles the product one layer at a time.
   ──────────────────────────────────────────────────────────── */

interface Layer {
  name: string;
  tag: string;
  body: string;
  tint: string;
  border: string;
  glow: string;
  visual: (on: boolean) => ReactNode;
}

const LAYERS: Layer[] = [
  {
    name: "Arrival",
    tag: "DICOM in",
    body: "A chest X-ray lands from the modality with a timestamp, an accession number and a location. Nothing about it says how sick the patient is.",
    tint: "linear-gradient(135deg, rgba(18,21,26,0.05), rgba(255,255,255,0.95))",
    border: "rgba(18,21,26,0.14)",
    glow: "0 26px 60px -24px rgba(18,21,26,0.40)",
    visual: (on) => (
      <div className="grid grid-cols-4 gap-1.5">
        {["1B7E4F", "9A3C5D", "7F2A91", "C48D02"].map((id, i) => (
          <div
            key={id}
            className="rounded border border-kx-border bg-kx-surface px-2 py-2 transition-all duration-500"
            style={{ opacity: on ? 1 : 0, transitionDelay: `${i * 70}ms` }}
          >
            <div className="h-6 rounded-sm bg-gradient-to-b from-kx-ink/15 to-kx-ink/5 mb-1.5" />
            <p className="font-mono text-[8px] text-kx-muted truncate">{id}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "Model Ensemble",
    tag: "3 CNNs, fused",
    body: "DenseNet121, GoogLeNet and ResNet18 each read the study independently. Their outputs are fused with learned weights, so no single model's blind spot decides a case.",
    tint: "linear-gradient(135deg, rgba(59,91,255,0.16), rgba(255,255,255,0.94))",
    border: "rgba(59,91,255,0.40)",
    glow: "0 26px 60px -22px rgba(59,91,255,0.45)",
    visual: (on) => (
      <div className="space-y-2">
        {[
          ["densenet121", 0.88],
          ["googlenet", 0.85],
          ["resnet18", 0.79],
        ].map(([n, v], i) => (
          <div key={n as string} className="flex items-center gap-2">
            <span className="font-mono text-[9px] w-[72px] text-kx-muted">{n}</span>
            <div className="flex-1 h-1.5 rounded-full bg-kx-surface2 overflow-hidden">
              <div
                className="h-full rounded-full bg-kx-accent2 transition-[width] duration-700 ease-out"
                style={{ width: on ? `${(v as number) * 100}%` : "0%", transitionDelay: `${i * 110}ms` }}
              />
            </div>
            <span className="font-mono text-[9px] w-7 text-right text-kx-ink">{v}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1.5 border-t border-kx-border">
          <span className="font-mono text-[9px] w-[72px] text-kx-muted">fused</span>
          <span className="font-mono text-[12px] text-kx-accent2 font-medium">0.86</span>
        </div>
      </div>
    ),
  },
  {
    name: "Explainability",
    tag: "Grad-CAM",
    body: "The overlay shows which region drove the score. A flag you can't check isn't worth having — so every result ships with the evidence attached.",
    tint: "linear-gradient(135deg, rgba(232,80,58,0.14), rgba(255,255,255,0.94))",
    border: "rgba(232,80,58,0.40)",
    glow: "0 26px 60px -22px rgba(232,80,58,0.42)",
    visual: (on) => (
      <div className="flex items-center gap-4">
        <div className="relative w-[84px] h-[84px] rounded-lg overflow-hidden flex-shrink-0 bg-kx-ink/80">
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              opacity: on ? 1 : 0,
              background:
                "radial-gradient(closest-side at 38% 44%, rgba(232,80,58,0.85), rgba(232,80,58,0.3) 55%, transparent 72%)",
            }}
          />
          <span className="absolute bottom-1 left-1 font-mono text-[7px] uppercase tracking-wider text-white/80">
            grad-cam
          </span>
        </div>
        <div className="space-y-1.5 flex-1">
          {["Right lower lobe opacity", "Consolidation pattern", "Confidence 0.86"].map((t, i) => (
            <p
              key={t}
              className="font-mono text-[9px] text-kx-muted transition-all duration-500"
              style={{ opacity: on ? 1 : 0, transform: on ? "none" : "translateX(-6px)", transitionDelay: `${i * 90}ms` }}
            >
              · {t}
            </p>
          ))}
        </div>
      </div>
    ),
  },
  {
    name: "Triage & Ordering",
    tag: "The queue rewrites",
    body: "Fused scores become queue positions. The critical study moves to position one the moment it's scored — not on the next refresh, not when someone notices.",
    tint: "linear-gradient(135deg, rgba(15,157,110,0.16), rgba(255,255,255,0.94))",
    border: "rgba(15,157,110,0.42)",
    glow: "0 26px 60px -22px rgba(15,157,110,0.42)",
    visual: (on) => (
      <div className="space-y-1.5">
        {[
          ["C48D02", "CRITICAL", "text-kx-critical", 86],
          ["9A3C5D", "REVIEW", "text-amber-500", 54],
          ["7F2A91", "CLEAR", "text-emerald-500", 31],
        ].map(([id, b, c, v], i) => (
          <div
            key={id as string}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-kx-border bg-white transition-all duration-600 ease-out"
            style={{ opacity: on ? 1 : 0, transform: on ? "none" : "translateY(8px)", transitionDelay: `${i * 100}ms` }}
          >
            <span className="font-mono text-[9px] text-kx-muted w-3">{i + 1}</span>
            <span className="font-mono text-[10px] text-kx-ink flex-1">{id}</span>
            <span className={`font-mono text-[8px] tracking-wide ${c}`}>{b}</span>
            <span className={`font-mono text-[10px] w-7 text-right ${c}`}>{v}%</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "Radiologist Sign-off",
    tag: "The human call",
    body: "Kroix presents an ordering and its reasoning. The radiologist confirms or overrides, and that decision — not the model's — is what enters the record.",
    tint: "linear-gradient(135deg, rgba(200,159,101,0.18), rgba(255,255,255,0.95))",
    border: "rgba(200,159,101,0.45)",
    glow: "0 26px 60px -22px rgba(200,159,101,0.42)",
    visual: (on) => (
      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-1.5">
          <p className="font-mono text-[9px] text-kx-muted">C48D02 · pending sign-off</p>
          <div className="flex gap-2">
            <span
              className="flex-1 text-center font-mono text-[9px] py-1.5 rounded bg-emerald-500 text-white transition-all duration-500"
              style={{ opacity: on ? 1 : 0.25 }}
            >
              Confirm
            </span>
            <span className="flex-1 text-center font-mono text-[9px] py-1.5 rounded bg-kx-surface2 text-kx-muted">
              Override
            </span>
          </div>
          <p
            className="font-mono text-[8px] text-kx-muted transition-opacity duration-700"
            style={{ opacity: on ? 1 : 0, transitionDelay: "300ms" }}
          >
            signed · Dr. Chen · 14:02 · audit #4471
          </p>
        </div>
      </div>
    ),
  },
];

export function AboutLayerStack() {
  const [active, setActive] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActive(LAYERS.length - 1);
      return;
    }
    const t = setInterval(() => {
      if (!paused.current) setActive((a) => (a + 1) % LAYERS.length);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="py-28 md:py-36 px-6 bg-kx-surface2">
      <div className="max-w-[1240px] mx-auto">
        <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-kx-muted mb-4">What Kroix is</p>
        <h2 className="font-display text-[38px] md:text-[52px] leading-[1.04] tracking-[-0.03em] text-kx-ink max-w-3xl mb-5">
          A triage layer that sits on top of the worklist you already have.
        </h2>
        <p className="text-[17.5px] text-kx-muted max-w-2xl mb-16 leading-relaxed">
          Five layers, each one built on the one before it. Move down the list to assemble it.
        </p>

        <div className="grid lg:grid-cols-[minmax(0,340px)_1fr] gap-10 lg:gap-14 items-center">
          {/* rail — hovering an entry stacks it on top of everything above */}
          <ol className="space-y-2">
            {LAYERS.map((l, i) => {
              const included = i <= active;
              return (
                <li key={l.name}>
                  <button
                    onMouseEnter={() => {
                      paused.current = true;
                      setActive(i);
                    }}
                    onMouseLeave={() => (paused.current = false)}
                    onFocus={() => setActive(i)}
                    className={`w-full text-left pl-5 pr-5 py-4 rounded-xl border transition-all duration-300 flex items-center gap-3.5 ${
                      i === active
                        ? "bg-kx-ink text-white border-kx-ink shadow-[0_10px_28px_-14px_rgba(18,21,26,0.5)]"
                        : included
                          ? "bg-white text-kx-ink border-kx-border"
                          : "bg-transparent text-kx-muted/60 border-transparent hover:text-kx-ink"
                    }`}
                  >
                    <span
                      className={`font-mono text-[11px] w-6 flex-shrink-0 ${
                        i === active ? "text-white/50" : "text-kx-muted/50"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[17px] font-medium flex-1">{l.name}</span>
                    <span
                      className={`font-mono text-[10px] uppercase tracking-wider ${
                        i === active ? "text-white/45" : "text-kx-muted/50"
                      }`}
                    >
                      {l.tag}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* the stack — cards accumulate, newest on top */}
          <div className="relative h-[560px] sm:h-[620px] flex items-center justify-center">
            {LAYERS.map((l, i) => {
              const included = i <= active;
              const isTop = i === active;
              // Distance below the top card, in stack positions.
              const behind = active - i;
              return (
                <div
                  key={l.name}
                  className="absolute w-full max-w-[660px] rounded-3xl border p-9 md:p-10 transition-all duration-[600ms] ease-out"
                  style={{
                    background: l.tint,
                    borderColor: l.border,
                    boxShadow: isTop ? l.glow : "0 12px 30px -18px rgba(18,21,26,0.35)",
                    backdropFilter: "blur(3px)",
                    opacity: included ? (behind > 3 ? 0 : 1) : 0,
                    transform: included
                      ? `translateY(${-behind * 34}px) scale(${1 - behind * 0.045})`
                      : "translateY(46px) scale(0.9)",
                    zIndex: i + 1,
                    pointerEvents: "none",
                  }}
                >
                  <div className="flex items-baseline justify-between mb-5">
                    <span className="font-display text-[23px] font-medium text-kx-ink tracking-[-0.015em]">
                      {l.name}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-kx-muted">
                      {l.tag}
                    </span>
                  </div>

                  {/* only the top card renders its live visual + copy */}
                  <div
                    className="transition-opacity duration-500"
                    style={{ opacity: isTop ? 1 : 0 }}
                  >
                    <div className="min-h-[160px] mb-6">{l.visual(isTop)}</div>
                    <p className="text-[16px] leading-relaxed text-kx-muted border-t border-kx-border pt-6">
                      {l.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   A3 — Scattered problem cards
   The "everything is loose" framing: unordered studies drifting in space,
   with the critical one buried among them.
   ──────────────────────────────────────────────────────────── */

const SCATTER = [
  { src: "ER-1", txt: "Walk-in · chest pain", x: 4, y: 26, d: 0 },
  { src: "Rad-2", txt: "Routine follow-up", x: 22, y: 8, d: 0.4 },
  { src: "ICU-4", txt: "Post-op check", x: 44, y: 30, d: 0.9 },
  { src: "ER-3", txt: "Rib series", x: 66, y: 12, d: 0.2 },
  { src: "ICU-1", txt: "Respiratory distress", x: 30, y: 58, d: 0.7, critical: true },
  { src: "Rad-1", txt: "Pre-op clearance", x: 60, y: 62, d: 1.1 },
  { src: "ER-2", txt: "Cough, 3 weeks", x: 78, y: 44, d: 0.55 },
];

export function AboutScatter() {
  return (
    <section className="relative py-28 md:py-36 px-6 bg-kx-tint2 overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.6]"
        style={{
          background:
            "radial-gradient(900px circle at 80% 20%, rgba(59,91,255,0.12), transparent 60%), radial-gradient(700px circle at 10% 80%, rgba(59,91,255,0.08), transparent 55%)",
        }}
      />
      <div className="relative z-10 max-w-[1240px] mx-auto">
        <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-8 md:gap-16 items-start mb-16">
          {/* Deliberately one step under TraceBento's 58px — that section is the
              visual ceiling for the page. */}
          <h2 className="font-display text-[38px] md:text-[52px] leading-[1.02] tracking-[-0.035em] text-kx-ink">
            The queue has no
            <br />
            idea who's sick.
          </h2>
          <p className="text-[17.5px] leading-[1.7] text-kx-muted md:pt-3">
            A chest X-ray arrives with a timestamp, a location, and nothing else.
            The order it gets read in is the order it happened to arrive in. Kroix
            reads every study on arrival and turns that pile into a ranking.
          </p>
        </div>

        <div className="relative h-[380px] md:h-[420px]">
          {SCATTER.map((s) => (
            <Reveal
              key={s.src + s.txt}
              delayMs={s.d * 260}
              className="absolute"
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
            >
              <div
                className={`kx-float rounded-xl border bg-white px-4 py-3 shadow-[0_14px_36px_-18px_rgba(18,21,26,0.35)] w-[190px] ${
                  s.critical ? "border-kx-critical/45 ring-1 ring-kx-critical/20" : "border-kx-border"
                }`}
                style={{ animationDelay: `${s.d}s` }}
              >
                <span
                  className={`inline-block font-mono text-[9px] px-1.5 py-0.5 rounded-full border mb-2 ${
                    s.critical
                      ? "border-kx-critical/40 text-kx-critical"
                      : "border-kx-border text-kx-muted"
                  }`}
                >
                  {s.src}
                </span>
                <p className="text-[13px] text-kx-ink leading-snug">{s.txt}</p>
                {s.critical && (
                  <p className="font-mono text-[10px] text-kx-critical mt-1.5">
                    ← this one can't wait
                  </p>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   A4 — Manifesto paragraph
   One long editorial paragraph where only the load-bearing phrases are inked.
   ──────────────────────────────────────────────────────────── */

export function AboutManifesto() {
  return (
    <section className="py-32 md:py-44 px-6 bg-kx-ink">
      <div className="max-w-4xl mx-auto">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/35 mb-10">
          Kroix, in one paragraph
        </p>
        <p className="font-editorial text-[30px] md:text-[46px] leading-[1.28] tracking-[-0.015em] text-white/30">
          Kroix is <span className="text-white">triage software for radiology</span>. When a chest
          X-ray lands, three independently trained models read it, their scores are{" "}
          <span className="text-white">fused into a single urgency figure</span>, and the worklist
          reorders itself so the <span className="text-kx-critical">study that can't wait sits at the top</span>.
          The radiologist opens it to a Grad-CAM overlay showing exactly what the models reacted to
          — because <span className="text-white">a flag you can't check isn't worth having</span>. Kroix
          never makes the call. It decides <span className="text-white">what gets looked at first</span>.
        </p>

        <div className="grid sm:grid-cols-3 gap-8 mt-16 pt-10 border-t border-white/10">
          {[
            ["Not a diagnosis", "Every read is signed by a radiologist. Kroix orders; it does not decide."],
            ["Not a rip-and-replace", "It layers over the worklist you already run, rather than replacing PACS."],
            ["Not a black box", "Per-model scores and Grad-CAM overlays ship with every result."],
          ].map(([h, b]) => (
            <div key={h}>
              <p className="font-display text-[15px] font-medium text-white mb-2">{h}</p>
              <p className="text-[13px] leading-relaxed text-white/45">{b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   A5 — Numbered index
   A dense, confident table-of-contents treatment: the company as a spec sheet.
   ──────────────────────────────────────────────────────────── */

const INDEX = [
  { k: "What it is", v: "Urgency-ordered triage for chest radiography." },
  { k: "What it does", v: "Scores every study on arrival and reorders the worklist by clinical urgency." },
  { k: "How it decides", v: "Three CNNs read in parallel; their outputs are fused with learned weights." },
  { k: "How you check it", v: "Grad-CAM overlays and per-model scores accompany every result." },
  { k: "Who signs", v: "The radiologist. Always. Kroix is non-diagnostic by design." },
  { k: "Where it runs", v: "Alongside your existing worklist — no PACS replacement required." },
];

export function AboutIndex() {
  return (
    <section className="py-28 md:py-36 px-6 bg-kx-canvas">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-baseline justify-between mb-12 flex-wrap gap-4">
          <h2 className="font-display text-[34px] md:text-[52px] leading-[1.0] tracking-[-0.035em] text-kx-ink">
            Kroix, plainly.
          </h2>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-kx-muted">
            No slogan required
          </span>
        </div>

        <dl>
          {INDEX.map((row, i) => (
            <Reveal key={row.k} delayMs={i * 70}>
              <div className="group grid sm:grid-cols-[28px_190px_1fr] gap-x-6 gap-y-1 py-5 border-t border-kx-border transition-colors hover:bg-kx-surface/70">
                <span className="font-mono text-[11px] text-kx-muted/60 pt-1">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <dt className="font-display text-[16px] font-medium text-kx-ink pt-0.5">{row.k}</dt>
                <dd className="text-[16px] leading-[1.6] text-kx-muted group-hover:text-kx-ink transition-colors">
                  {row.v}
                </dd>
              </div>
            </Reveal>
          ))}
          <div className="border-t border-kx-border" />
        </dl>
      </div>
    </section>
  );
}
