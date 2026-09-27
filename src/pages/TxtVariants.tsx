import {
  TxtPlaintext, TxtLedger, TxtSplit, TxtTimeline, TxtCommand,
} from "@/components/dashboard/TxtVariants";
import { TxtReviewer, TxtAnalytics, TxtUpload } from "@/components/dashboard/TxtSurfaces";

const WORKLISTS = [
  {
    n: "T1", name: "Plaintext",
    note: "The purest reading of the brief. Fixed columns, one hairline under the header, click any row to expand it in place. Nothing navigates, so the queue never disappears. Most rows per screen with detail available.",
    trade: "Expanding pushes everything below it down — the list moves under you.",
    C: TxtPlaintext,
  },
  {
    n: "T2", name: "Ledger",
    note: "The same data ruled like a spreadsheet: column dividers, zebra hairlines, sortable headers, a totals row. Scans best DOWN a column — the right shape for questions like “which of these is oldest”.",
    trade: "Heaviest of the five. The grid lines are information too, and there are a lot of them.",
    C: TxtLedger,
  },
  {
    n: "T3", name: "Split",
    note: "Queue on the left, the selected study permanently open on the right. Closest to how a PACS worklist actually behaves, and the only variant where opening a study costs nothing — no navigation, no back button.",
    trade: "Half the width goes to one study, so the queue column is narrow and drops columns.",
    C: TxtSplit,
  },
  {
    n: "T4", name: "Timeline",
    note: "Position carries the meaning. Every study sits on one axis from “just arrived” to “target missed”, with the 80% threshold drawn. The shape of the queue is legible without reading a number — the one thing a sorted list cannot do.",
    trade: "Buries the score and the identifiers. Answers “how bad is the queue”, not “what is this study”.",
    C: TxtTimeline,
  },
  {
    n: "T5", name: "Command",
    note: "Keyboard first. The list is a result set: type to filter across patient, finding, band and modality. One line of chrome. Fastest of the five once learned, for a surface someone sits in eight hours a day.",
    trade: "Least discoverable. A radiologist who never finds the filter sees a plain list.",
    C: TxtCommand,
  },
];

const SURFACES = [
  {
    n: "S1", name: "Reviewer",
    note: "One study. Provenance prints what the system does NOT know in the same weight as what it does — the pediatric-cohort caveat sits in the same list as 97.7%, and confidence is marked uncalibrated. Footnoting that is how 98.9% survived on the landing page for two months.",
    C: TxtReviewer,
  },
  {
    n: "S2", name: "Analytics",
    note: "Numbers as a text file — no chart library, a bar is a run of background. Every figure carries what produced it, and there is deliberately no comparison arm: a “without Kroix” number requires the SLA replay over a real historical worklist, not a mockup.",
    C: TxtAnalytics,
  },
  {
    n: "S3", name: "Upload & unscored",
    note: "Four states, switchable. The one that matters is `unscored` — what the product looks like when inference fails. The image is stored, no triage row is written, and the row says so. There is no substitute score, which is the whole reason this state needs a design.",
    C: TxtUpload,
  },
];

function Band({ n, name, note, trade }: { n: string; name: string; note: string; trade?: string }) {
  return (
    <div className="px-10 py-5 bg-kx-surface2 border-y border-kx-border">
      <div className="max-w-5xl flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
        <span className="font-mono text-[13px] text-kx-critical-ink font-semibold">{n}</span>
        <span className="font-display text-[17px] font-medium text-kx-ink">{name}</span>
        <p className="text-[13px] text-kx-muted w-full leading-relaxed">{note}</p>
        {trade && (
          <p className="font-mono text-[11.5px] text-kx-muted/90 w-full">
            <span className="text-kx-warn">trade-off</span> · {trade}
          </p>
        )}
      </div>
    </div>
  );
}

export default function TxtVariants() {
  return (
    <div className="bg-kx-canvas min-h-screen">
      <div className="sticky top-0 z-50 bg-kx-ink text-white px-10 py-3 flex items-center justify-between">
        <span className="font-display font-semibold text-[15px]">Kroix · inner app · T-series</span>
        <div className="flex items-center gap-4">
          {[["/editorial-variants", "E-series"], ["/worklist-variants", "W-series"], ["/reader-variants", "reader"], ["/dashboard", "live app"]].map(([href, label]) => (
            <a key={href} href={href} className="font-mono text-[12px] text-white/50 hover:text-white transition-colors">{label} →</a>
          ))}
        </div>
      </div>

      <div className="px-10 py-9 bg-kx-ink text-white">
        <div className="max-w-4xl">
          <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-white/40 mb-4">T-series</p>
          <p className="font-display text-[32px] leading-[1.15] font-medium tracking-[-0.02em] mb-5">
            Plain text, on the landing page&rsquo;s own palette.
          </p>
          <p className="text-[14px] text-white/60 leading-relaxed">
            The brief: light, aligned with the landing page, the best UX for a radiologist,
            interactive, not overwhelming, and it should look like a .txt file. Those pull
            against each other. The resolution is the same in all eight screens — the .txt
            quality comes from <em>removing</em> things (no cards, no radius, no shadows, no
            icons, mono throughout, hairline rules), and &ldquo;not overwhelming&rdquo; is solved by
            progressive disclosure rather than by showing less.
          </p>
          <p className="text-[13px] text-white/40 leading-relaxed mt-4">
            Landing tokens only — <span className="font-mono">kx-canvas</span> ground,{" "}
            <span className="font-mono">kx-ink</span> text, <span className="font-mono">kx-muted</span> secondary,{" "}
            <span className="font-mono">kx-accent2</span> selection. No new colours.
            Colour appears twice and only twice: the severity rule, and the waiting figure once a
            study is genuinely late.
          </p>
          <p className="font-mono text-[11.5px] text-white/35 leading-relaxed mt-4">
            Contrast is computed, not judged: kx-critical is 3.72:1 and kx-accent3 is 3.46:1 on
            white, so both are fills and never text. Red text is kx-critical-ink at 6.03:1.
            Selected rows go to full ink because kx-muted drops to 4.30:1 on the kx-tint2 tint.
          </p>
          <p className="text-[13px] text-white/40 mt-5">
            All five worklists render the same thirteen sample studies in the same order — closest
            to breaching its read-time target first. Only the presentation changes, never the logic.
          </p>
        </div>
      </div>

      <div className="px-10 py-4 bg-kx-tint2 border-y border-kx-border">
        <p className="font-mono text-[12px] text-kx-ink max-w-5xl">
          Five worklists, then the three surfaces that decide whether the language holds — a list
          survives any style; the reviewer, the analytics page and a failed upload do not.
        </p>
      </div>

      {WORKLISTS.map(({ n, name, note, trade, C }) => (
        <div key={n}>
          <Band n={n} name={name} note={note} trade={trade} />
          <C />
        </div>
      ))}

      <div className="px-10 py-7 bg-kx-ink text-white">
        <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-white/40 mb-3">The rest of the inner app</p>
        <p className="text-[14px] text-white/60 leading-relaxed max-w-3xl">
          Rendered in the T1 language, because it is the one the other four are variations on.
          Whichever worklist wins, these three come with it.
        </p>
      </div>

      {SURFACES.map(({ n, name, note, C }) => (
        <div key={n}>
          <Band n={n} name={name} note={note} />
          <C />
        </div>
      ))}
    </div>
  );
}
