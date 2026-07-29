import { useMemo, useState } from "react";
import fixture from "@/validation/studies.json";
import {
  spearman,
  confidenceInterval95,
  verdictFor,
  VERDICT_COPY,
  seededShuffle,
} from "@/validation/stats";

/**
 * Validation sprint harness. DEV-only, never publicly routable.
 *
 * Answers one question: does Kroix's ordering match a radiologist's judgment on the
 * medium-severity band?
 *
 * Blinding is enforced structurally rather than by discipline. During the rating
 * phases the component never reads `kroixScore` at all, so there is no way to leak
 * the model's opinion into the rater's. Scores become reachable only after the rater
 * commits, at which point their input is frozen.
 */

type Band = "medium" | "normal" | "critical";
type Bucket = "first" | "routine" | "wait";
type Phase = "brief" | "bucket" | "rank" | "reveal";

interface Study {
  id: string;
  arrivalIndex: number;
  band: Band;
  label: string;
  kroixScore: number;
}

const STUDIES = fixture.studies as Study[];
const SCORES_ARE_REAL = fixture._scoresAreReal as boolean;

const BUCKETS: { key: Bucket; label: string; hint: string; urgency: number }[] = [
  { key: "first", label: "Read first", hint: "Would pull this forward", urgency: 3 },
  { key: "routine", label: "Routine", hint: "Normal queue position", urgency: 2 },
  { key: "wait", label: "Can wait", hint: "Safe to read late", urgency: 1 },
];

export default function Validation() {
  const [phase, setPhase] = useState<Phase>("brief");
  const [seed] = useState(() => Math.floor(Math.random() * 1e9));
  const [buckets, setBuckets] = useState<Record<string, Bucket>>({});
  const [topOrder, setTopOrder] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [premiseAnswer, setPremiseAnswer] = useState<string>("");

  // Randomised presentation order. Arrival order would itself be a prior.
  const presented = useMemo(() => seededShuffle(STUDIES, seed), [seed]);

  const assigned = Object.keys(buckets).length;
  const allAssigned = assigned === STUDIES.length;
  const topBucket = presented.filter((s) => buckets[s.id] === "first");

  function startRanking() {
    setTopOrder(topBucket.map((s) => s.id));
    setPhase(topBucket.length > 1 ? "rank" : "reveal");
  }

  function move(id: string, dir: -1 | 1) {
    setTopOrder((prev) => {
      const i = prev.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-kx-canvas text-kx-ink">
      <Header phase={phase} assigned={assigned} total={STUDIES.length} />

      <main className="max-w-6xl mx-auto px-6 py-10">
        {phase === "brief" && <Brief onStart={() => setPhase("bucket")} />}

        {phase === "bucket" && (
          <BucketPhase
            presented={presented}
            buckets={buckets}
            notes={notes}
            onAssign={(id, b) => setBuckets((p) => ({ ...p, [id]: b }))}
            onNote={(id, v) => setNotes((p) => ({ ...p, [id]: v }))}
            allAssigned={allAssigned}
            onDone={startRanking}
          />
        )}

        {phase === "rank" && (
          <RankPhase
            order={topOrder}
            byId={Object.fromEntries(STUDIES.map((s) => [s.id, s]))}
            onMove={move}
            onDone={() => setPhase("reveal")}
          />
        )}

        {phase === "reveal" && (
          <Reveal
            buckets={buckets}
            topOrder={topOrder}
            notes={notes}
            premiseAnswer={premiseAnswer}
            onPremise={setPremiseAnswer}
            seed={seed}
          />
        )}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Header({ phase, assigned, total }: { phase: Phase; assigned: number; total: number }) {
  const steps: { key: Phase; n: string; label: string }[] = [
    { key: "brief", n: "00", label: "Brief" },
    { key: "bucket", n: "01", label: "Sort into urgency buckets" },
    { key: "rank", n: "02", label: "Order the top bucket" },
    { key: "reveal", n: "03", label: "Reveal and compare" },
  ];
  return (
    <div className="sticky top-0 z-40 bg-kx-ink text-white px-6 py-3">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="font-display font-semibold text-[15px]">Kroix · validation sprint</span>
        <div className="flex items-center gap-4 flex-1">
          {steps.map((s) => (
            <span
              key={s.key}
              className={`font-mono text-[11px] tracking-wide ${
                s.key === phase ? "text-white" : "text-white/35"
              }`}
            >
              {s.n} {s.label}
            </span>
          ))}
        </div>
        {phase === "bucket" && (
          <span className="font-mono text-[12px] text-white/60">
            {assigned}/{total} sorted
          </span>
        )}
      </div>
    </div>
  );
}

function Brief({ onStart }: { onStart: () => void }) {
  return (
    <div className="max-w-2xl">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-kx-accent3 mb-4">
        Before you start
      </p>
      <h1 className="font-display text-[38px] md:text-[46px] leading-[1.05] tracking-[-0.03em] mb-6">
        Sort these chest X-rays the way you would read them.
      </h1>

      <div className="space-y-4 text-[16px] text-kx-muted leading-relaxed mb-8">
        <p>
          You will see {STUDIES.length} studies in random order. Sort each into one of three
          buckets: read first, routine, or can wait. Then put the “read first” pile in
          the order you would actually work through it.
        </p>
        <p>
          <span className="text-kx-ink font-medium">
            You will not see the model's scores until you are done.
          </span>{" "}
          That is deliberate. Seeing them first would anchor your judgment and the
          comparison would measure nothing.
        </p>
        <p>
          There are no right answers here, and disagreement is the useful part. If a
          study makes you hesitate, say why in its note field — that is more valuable
          than the ranking itself.
        </p>
      </div>

      {!SCORES_ARE_REAL && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 mb-8">
          <p className="text-[13.5px] text-kx-ink">
            <span className="font-medium">Placeholder scores.</span> The fixture is
            marked <code className="font-mono text-[12.5px]">_scoresAreReal: false</code>.
            Run the ensemble over these studies and paste real output into{" "}
            <code className="font-mono text-[12.5px]">src/validation/studies.json</code>{" "}
            before running this with a radiologist. Any result produced now measures the
            placeholder numbers, not the model.
          </p>
        </div>
      )}

      <button
        onClick={onStart}
        className="px-6 py-3 bg-kx-ink text-white rounded-full text-[14.5px] font-medium hover:opacity-90 transition-opacity"
      >
        Start sorting
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Thumb({ id }: { id: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="w-full aspect-[4/5] rounded-lg bg-kx-ink/90 flex flex-col items-center justify-center gap-1">
        <span className="font-mono text-[10px] text-white/40">no image</span>
        <span className="font-mono text-[10px] text-white/25">{id}</span>
      </div>
    );
  }
  return (
    <img
      src={`/validation-studies/${id}.png`}
      alt=""
      onError={() => setFailed(true)}
      className="w-full aspect-[4/5] object-cover rounded-lg bg-kx-ink"
    />
  );
}

function BucketPhase({
  presented,
  buckets,
  notes,
  onAssign,
  onNote,
  allAssigned,
  onDone,
}: {
  presented: Study[];
  buckets: Record<string, Bucket>;
  notes: Record<string, string>;
  onAssign: (id: string, b: Bucket) => void;
  onNote: (id: string, v: string) => void;
  allAssigned: boolean;
  onDone: () => void;
}) {
  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {presented.map((s) => {
          const chosen = buckets[s.id];
          return (
            <div
              key={s.id}
              className={`rounded-2xl border bg-white p-4 transition-colors ${
                chosen ? "border-kx-accent3/40" : "border-kx-border"
              }`}
            >
              <Thumb id={s.id} />

              {/* Only the id is shown. Not the label, not the band, not the score:
                  all three would bias the rating. */}
              <p className="font-mono text-[12px] text-kx-muted mt-3 mb-3">{s.id}</p>

              <div className="flex gap-1.5 mb-3">
                {BUCKETS.map((b) => (
                  <button
                    key={b.key}
                    onClick={() => onAssign(s.id, b.key)}
                    title={b.hint}
                    className={`flex-1 px-2 py-2 rounded-lg text-[12px] font-medium border transition-colors ${
                      chosen === b.key
                        ? "bg-kx-ink text-white border-kx-ink"
                        : "bg-kx-surface text-kx-muted border-kx-border hover:text-kx-ink"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              <input
                value={notes[s.id] ?? ""}
                onChange={(e) => onNote(s.id, e.target.value)}
                placeholder="Why? (optional)"
                className="w-full px-3 py-2 rounded-lg bg-kx-surface border border-kx-border text-[12.5px] text-kx-ink placeholder:text-kx-muted/70 focus:outline-none focus:border-kx-accent2/50"
              />
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 mt-8 -mx-6 px-6 py-4 bg-kx-canvas/95 backdrop-blur border-t border-kx-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <p className="text-[13.5px] text-kx-muted">
            {allAssigned
              ? "All sorted. Next you will order the “read first” pile."
              : "Sort every study to continue."}
          </p>
          <button
            disabled={!allAssigned}
            onClick={onDone}
            className="px-6 py-2.5 bg-kx-ink text-white rounded-full text-[14px] font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

function RankPhase({
  order,
  byId,
  onMove,
  onDone,
}: {
  order: string[];
  byId: Record<string, Study>;
  onMove: (id: string, dir: -1 | 1) => void;
  onDone: () => void;
}) {
  return (
    <div className="max-w-2xl">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-kx-accent2 mb-4">
        Step 02
      </p>
      <h2 className="font-display text-[32px] leading-[1.1] tracking-[-0.02em] mb-3">
        Put the “read first” pile in order.
      </h2>
      <p className="text-[15.5px] text-kx-muted leading-relaxed mb-8">
        Top of the list is the one you would open first. Only this bucket needs ordering;
        forcing a full ranking of all {STUDIES.length} is unreliable at the tails.
      </p>

      <div className="space-y-2 mb-8">
        {order.map((id, i) => (
          <div
            key={id}
            className="flex items-center gap-4 rounded-xl border border-kx-border bg-white px-4 py-3"
          >
            <span className="font-mono text-[13px] text-kx-critical w-6">{i + 1}</span>
            <div className="w-10 flex-shrink-0">
              <Thumb id={id} />
            </div>
            <span className="font-mono text-[13px] text-kx-ink flex-1">{byId[id].id}</span>
            <div className="flex gap-1">
              <button
                onClick={() => onMove(id, -1)}
                disabled={i === 0}
                aria-label="Move up"
                className="px-2.5 py-1 rounded-md border border-kx-border text-kx-muted hover:text-kx-ink disabled:opacity-25"
              >
                ↑
              </button>
              <button
                onClick={() => onMove(id, 1)}
                disabled={i === order.length - 1}
                aria-label="Move down"
                className="px-2.5 py-1 rounded-md border border-kx-border text-kx-muted hover:text-kx-ink disabled:opacity-25"
              >
                ↓
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onDone}
        className="px-6 py-3 bg-kx-ink text-white rounded-full text-[14.5px] font-medium hover:opacity-90 transition-opacity"
      >
        Lock in and reveal
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Reveal({
  buckets,
  topOrder,
  notes,
  premiseAnswer,
  onPremise,
  seed,
}: {
  buckets: Record<string, Bucket>;
  topOrder: string[];
  notes: Record<string, string>;
  premiseAnswer: string;
  onPremise: (v: string) => void;
  seed: number;
}) {
  const analysis = useMemo(() => {
    const urgency = Object.fromEntries(BUCKETS.map((b) => [b.key, b.urgency]));

    // Rater urgency score. Ordering within the top bucket breaks ties there, so the
    // study the rater would open first sits strictly above the rest of that bucket.
    const raterScore = (s: Study) => {
      const base = urgency[buckets[s.id]] ?? 0;
      const idx = topOrder.indexOf(s.id);
      if (idx === -1) return base;
      return base + (topOrder.length - idx) / (topOrder.length + 1);
    };

    const build = (subset: Study[]) => {
      const rater = subset.map(raterScore);
      const kroix = subset.map((s) => s.kroixScore);
      // FIFO: earlier arrival is read earlier, so invert the index to make it a
      // "priority" comparable to the others.
      const fifo = subset.map((s) => -s.arrivalIndex);
      const rand = seededShuffle(
        subset.map((_, i) => i),
        seed ^ 0x5f3759df
      );
      return {
        kroix: spearman(rater, kroix),
        fifo: spearman(rater, fifo),
        random: spearman(rater, rand),
        n: subset.length,
      };
    };

    const medium = STUDIES.filter((s) => s.band === "medium");
    return { all: build(STUDIES), medium: build(medium) };
  }, [buckets, topOrder, seed]);

  const rho = analysis.medium.kroix;
  const verdict = verdictFor(rho);
  const copy = VERDICT_COPY[verdict];
  const ci = rho !== null ? confidenceInterval95(rho, analysis.medium.n) : null;

  const disagreements = useMemo(() => {
    const urgency = Object.fromEntries(BUCKETS.map((b) => [b.key, b.urgency]));
    return STUDIES.map((s) => {
      const raterUrgency = urgency[buckets[s.id]] ?? 0;
      // Map the model's 0-1 score onto the same three-band scale for comparison.
      const modelUrgency = s.kroixScore >= 0.6 ? 3 : s.kroixScore >= 0.3 ? 2 : 1;
      return { s, raterUrgency, modelUrgency, gap: Math.abs(raterUrgency - modelUrgency) };
    })
      .filter((d) => d.gap > 0)
      .sort((a, b) => b.gap - a.gap);
  }, [buckets]);

  const exportPayload = {
    ranAt: new Date().toISOString(),
    scoresAreReal: SCORES_ARE_REAL,
    datasetSource: fixture._datasetSource,
    buckets,
    topOrder,
    notes,
    premiseAnswer,
    analysis,
  };

  return (
    <div className="space-y-10">
      {/* Verdict */}
      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-kx-muted mb-4">
          Result · medium band, n={analysis.medium.n}
        </p>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 mb-4">
          <span className="font-mono text-[56px] leading-none text-kx-ink">
            {rho === null ? "—" : rho.toFixed(2)}
          </span>
          <span className={`font-display text-[24px] ${copy.tone}`}>{copy.label}</span>
        </div>
        <p className="text-[15.5px] text-kx-muted leading-relaxed max-w-2xl mb-3">{copy.detail}</p>
        {ci && (
          <p className="text-[14px] text-kx-muted max-w-2xl">
            95% CI [{ci[0].toFixed(2)}, {ci[1].toFixed(2)}]. At this sample size the interval
            spans most of the usable range. This is a smoke test, not a validation study — it
            can detect the extremes and cannot resolve the middle.
          </p>
        )}
      </section>

      {/* Baselines */}
      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-kx-muted mb-4">
          Against the baselines
        </p>
        <div className="rounded-2xl border border-kx-border bg-white overflow-hidden">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-kx-border text-kx-muted">
                <th className="text-left font-medium px-5 py-3">Ordering</th>
                <th className="text-right font-medium px-5 py-3">Medium band</th>
                <th className="text-right font-medium px-5 py-3">All studies</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kx-border">
              <Row label="Kroix" hint="the ensemble" m={analysis.medium.kroix} a={analysis.all.kroix} strong />
              <Row label="FIFO" hint="arrival order — the incumbent" m={analysis.medium.fifo} a={analysis.all.fifo} />
              <Row label="Random" hint="floor" m={analysis.medium.random} a={analysis.all.random} />
            </tbody>
          </table>
        </div>
        <p className="text-[13.5px] text-kx-muted mt-3 max-w-2xl">
          Beating FIFO is the minimum bar for the product to exist at all. If Kroix does not
          clear arrival order on the medium band, reordering is not adding anything.
        </p>
      </section>

      {/* Disagreements */}
      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-kx-muted mb-2">
          Disagreements · {disagreements.length}
        </p>
        <p className="text-[14.5px] text-kx-muted mb-5 max-w-2xl">
          Where the rater and the model placed a study in different urgency bands. These are
          more informative than the agreements — ask the radiologist to talk through each one.
        </p>
        <div className="space-y-2">
          {disagreements.length === 0 && (
            <p className="text-[14px] text-kx-muted">None. Suspicious at this sample size.</p>
          )}
          {disagreements.map(({ s, raterUrgency, modelUrgency }) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-kx-border bg-white px-5 py-3"
            >
              <span className="font-mono text-[13px] text-kx-ink w-16">{s.id}</span>
              <span className="text-[13.5px] text-kx-ink flex-1 min-w-[220px]">{s.label}</span>
              <span className="font-mono text-[11px] uppercase tracking-wide text-kx-muted">
                {s.band}
              </span>
              <span className="text-[13px] text-kx-muted">
                rater {urgencyName(raterUrgency)} · model {urgencyName(modelUrgency)}
              </span>
              {notes[s.id] && (
                <span className="text-[13px] text-kx-accent2 w-full">“{notes[s.id]}”</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* The premise question — independent of Kroix's output */}
      <section className="max-w-2xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-kx-muted mb-2">
          Ask this out loud, and record the answer
        </p>
        <p className="text-[15.5px] text-kx-ink leading-relaxed mb-4">
          “Independent of anything my model did — is the medium-severity band actually where
          your delay risk lives?”
        </p>
        <p className="text-[13.5px] text-kx-muted mb-4">
          This tests the premise the whole product rests on. Kroix could match your ranking
          perfectly and this could still be false.
        </p>
        <textarea
          value={premiseAnswer}
          onChange={(e) => onPremise(e.target.value)}
          rows={4}
          placeholder="Their answer, in their words…"
          className="w-full px-4 py-3 rounded-xl bg-white border border-kx-border text-[14px] text-kx-ink placeholder:text-kx-muted/70 focus:outline-none focus:border-kx-accent2/50"
        />
      </section>

      {/* Export */}
      <section className="pb-16">
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `kroix-validation-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="px-6 py-3 bg-kx-ink text-white rounded-full text-[14.5px] font-medium hover:opacity-90 transition-opacity"
        >
          Export session JSON
        </button>
        {!SCORES_ARE_REAL && (
          <p className="text-[13px] text-amber-600 mt-4 max-w-2xl">
            Reminder: these numbers come from placeholder scores. They describe the fixture,
            not the ensemble. Do not report them.
          </p>
        )}
      </section>
    </div>
  );
}

function Row({
  label,
  hint,
  m,
  a,
  strong,
}: {
  label: string;
  hint: string;
  m: number | null;
  a: number | null;
  strong?: boolean;
}) {
  const fmt = (v: number | null) => (v === null ? "—" : v.toFixed(2));
  return (
    <tr>
      <td className="px-5 py-3">
        <span className={strong ? "text-kx-ink font-medium" : "text-kx-ink"}>{label}</span>
        <span className="text-kx-muted text-[13px] ml-2">{hint}</span>
      </td>
      <td className={`px-5 py-3 text-right font-mono ${strong ? "text-kx-critical" : "text-kx-muted"}`}>
        {fmt(m)}
      </td>
      <td className="px-5 py-3 text-right font-mono text-kx-muted">{fmt(a)}</td>
    </tr>
  );
}

function urgencyName(u: number) {
  return u === 3 ? "read first" : u === 2 ? "routine" : "can wait";
}
