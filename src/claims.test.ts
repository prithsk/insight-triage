import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Claim discipline, enforced.
 *
 * Nine fabricated claims have shipped over this project's life:
 *
 *   1. a `Math.random()` "scans reviewed per hour, with vs. without Kroix"
 *      chart under a `LIVE · 7-DAY` badge
 *   2. a testimonial attributed to "Pilot deployment, regional imaging network"
 *   3. "Clinical-grade accuracy" and a `VALIDATED` badge over a 5-fold CV number
 *   4. "Currently in active pilot testing" in README.md
 *   5. a synthetic "without Kroix" comparison arm in useAnalytics, exported to CSV
 *   6. `Math.random()` scores under the heading "Live worklist" with a pulsing dot
 *   7. a headline accuracy of 98.9%, which appears in no artifact in this repo
 *      (`services/ml-api/ensemble_weights.json` records 0.977…)
 *   8. per-model fusion weights of 0.42 / 0.33 / 0.25; the same artifact records
 *      three exact thirds
 *   9. `syntheticFallback()` in `supabase/functions/infer-cxr` — a `Math.random()`
 *      risk score, bucket and confidence returned with HTTP 200, written to
 *      `triage_results` and used to order a live reading queue
 *
 * Every one of them typechecked. Every one was found by a human reading the
 * source, and several survived multiple review passes precisely because
 * "typecheck passes" was mistaken for "this is true". This file is the first
 * automated gate on the class.
 *
 * It is deliberately a static scan of source text rather than a behavioural
 * test: the failure mode is a claim being WRITTEN, so the source is the right
 * place to catch it. It cannot catch a novel phrasing — nothing can — but it
 * makes reintroducing any of the nine shapes above a failing build.
 *
 * The artifact blocks read `services/ml-api/ensemble_weights.json` at test time
 * rather than hardcoding what it currently says, so retraining the model moves
 * the assertion instead of breaking it.
 *
 * SCOPE NOTE. Until the ninth shape, every rule here scanned `src/` only. That
 * is why none of them saw a random number generator sitting in an edge function
 * for months: the fabrication was not on the marketing site, it was inside the
 * clinical app, on the server. The edge-function block below closes that gap.
 */

const SRC = path.resolve(__dirname);
const REPO = path.resolve(__dirname, "..");
const EDGE_FUNCTIONS = path.join(REPO, "supabase", "functions");

/** Every .ts/.tsx under src/, excluding this file and DEV-gated variant labs. */
function sourceFiles(dir = SRC, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      sourceFiles(full, acc);
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

/**
 * Files that ship to a visitor. The variant galleries and the validation page
 * are behind `import.meta.env.DEV` and carry their own sample-data labels, so
 * they are excluded — but only these exact paths, so a new file is covered by
 * default rather than by omission.
 */
const DEV_ONLY = [
  "pages/HeroVariants.tsx",
  "pages/AboutVariants.tsx",
  "pages/InfoVariants.tsx",
  "pages/TraceVariants.tsx",
  "pages/WorklistVariants.tsx",
  "pages/ReaderVariants.tsx",
  "pages/AnalyticsVariants.tsx",
  "pages/HeroLab.tsx",
  "pages/MotionLab.tsx",
  "pages/Validation.tsx",
  "components/dashboard/WorklistVariants.tsx",
  "components/dashboard/WorklistReaderVariants.tsx",
  "components/dashboard/AnalyticsVariants.tsx",
  "components/landing/heroes/LabHeroes.tsx",
  "components/landing/motion/ThreadedPages.tsx",
  "components/landing/motion/useScrollThread.ts",
];

const shipped = () =>
  sourceFiles().filter((f) => {
    const rel = path.relative(SRC, f).replace(/\\/g, "/");
    return !DEV_ONLY.includes(rel);
  });

/** Strip comments so the rules describing a removed claim don't trip the rules. */
function code(file: string): string {
  return fs
    .readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

/**
 * The same idea for Python: drop docstrings and whole-line `#` comments, so a
 * comment explaining a removed defect does not read as the defect. The Grad-CAM
 * fix below is documented by naming the `.train()` call it replaced.
 */
function pyCode(file: string): string {
  return fs
    .readFileSync(file, "utf8")
    .replace(/"""[\s\S]*?"""/g, "")
    .replace(/^\s*#.*$/gm, "");
}

const rel = (f: string) => path.relative(REPO, f).replace(/\\/g, "/");

describe("claims: no unearned language ships to a visitor", () => {
  // "Clinical", "validated" and "clinical-grade" are promotional claims for an
  // uncleared Class II CADt device (21 CFR 892.2080). None may appear until a
  // clearance exists.
  it("does not claim clinical validation", () => {
    const banned = /clinical[- ]grade|clinically validated|\bFDA[- ](cleared|approved)\b/gi;
    const offenders = shipped()
      .filter((f) => {
        const src = code(f);
        for (const m of src.matchAll(banned)) {
          // "Is Kroix FDA-cleared? No." is the honest answer, not a claim.
          // Look at the surrounding sentence for a negation before flagging.
          const around = src.slice(Math.max(0, m.index! - 90), m.index! + 140);
          if (/\bnot\b|\bno\b|\bnever\b|pre[- ]clearance|isn't|is not/i.test(around)) continue;
          return true;
        }
        return false;
      })
      .map(rel);

    expect(
      offenders,
      `Kroix is pre-clearance. These files claim otherwise:\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  it("does not claim a pilot, customer, or deployment that does not exist", () => {
    // "pilot deployment", "in pilot", "our customers", "trusted by" — all
    // describe relationships that have never existed.
    const banned = /pilot deployment|active pilot|in pilot testing|trusted by|our customers\b/i;
    const offenders = shipped()
      .filter((f) => banned.test(code(f)))
      .map(rel);

    expect(
      offenders,
      `No pilot, customer, or deployment exists. These files imply one:\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  it("does not claim an outcome the replay has never measured", () => {
    // A percentage attached to faster/fewer/reduction is an effect claim, and
    // no effect has been measured. "30% faster time to diagnosis" shipped on
    // /about for weeks.
    const banned = /\d+\s*%\s*(faster|fewer|reduction|improvement|more accurate)|better patient outcomes|reduces? (mortality|errors|missed)/i;
    const offenders = shipped()
      .filter((f) => banned.test(code(f)))
      .map(rel);

    expect(
      offenders,
      `Kroix has never been measured against not using Kroix:\n${offenders.join("\n")}`
    ).toEqual([]);
  });
});

describe("claims: synthetic data never wears a live badge", () => {
  /**
   * The core defect shape, twice shipped: a component that generates values
   * with Math.random() and labels the result live, or real-time, or a feed.
   * Either half alone is fine — a skeleton loader may use Math.random(), and a
   * genuinely live component may say "live". Together they are a fabrication.
   */
  it("no shipped file both generates random values and calls them live", () => {
    const offenders = shipped()
      .filter((f) => {
        const src = code(f);
        if (!/Math\.random\s*\(/.test(src)) return false;
        return /\blive\b|real[- ]?time|\bLIVE\b|streaming now/i.test(src);
      })
      .map(rel);

    expect(
      offenders,
      `Math.random() beside live/real-time language. Either the data is real or ` +
        `the label is wrong:\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  it("the worklist demo does not mutate a study's score", () => {
    // A finding does not change while a study waits in a queue. The previous
    // version jittered every score every 2.6s, so a film drifted from CLEAR to
    // CRITICAL and back — depicting something that cannot happen.
    const src = code(path.join(SRC, "components/landing/LiveQueueHero.tsx"));
    expect(src, "LiveQueueHero must not use Math.random()").not.toMatch(/Math\.random/);
    expect(src, "LiveQueueHero must label itself illustrative").toMatch(/[Ii]llustrative/);

    // "not a live feed" is the disclaimer; "Live worklist" was the claim.
    // Only flag the word when it is not being negated.
    for (const m of src.matchAll(/\blive\b/gi)) {
      const around = src.slice(Math.max(0, m.index! - 40), m.index! + 40);
      expect(
        around,
        `LiveQueueHero uses "live" as a claim rather than a denial: …${around.trim()}…`
      ).toMatch(/\bnot\b|\bno\b|isn't/i);
    }
  });

  it("AnalyticsData has no comparison arm", () => {
    // The synthetic "without Kroix" baseline was generated on every render,
    // charted against the measured series, and exported to CSV. The field is
    // gone so it cannot be reintroduced by accident.
    const src = code(path.join(SRC, "hooks/useAnalytics.ts"));
    expect(src, "useAnalytics must not reintroduce a withoutKroix arm").not.toMatch(/withoutKroix/);
    expect(src, "useAnalytics must not import mock generators").not.toMatch(/mock-data/);
  });
});

describe("claims: identifiers are not guessable", () => {
  it("patient_hash is generated from a CSPRNG", () => {
    // Math.random() gave ~44% collision probability at 50k studies on a column
    // with no UNIQUE constraint. A collision merges two patients' studies.
    const src = code(path.join(SRC, "hooks/useUploadDicom.ts"));
    expect(src, "patient_hash must not come from Math.random()").not.toMatch(/Math\.random/);
    expect(src, "patient_hash must use crypto.randomUUID()").toMatch(/crypto\.randomUUID/);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   The seventh shape: a number that exists, but not in any artifact.

   98.9% shipped as headline model accuracy on the public landing page, and as
   an "Ensemble agreement" tile in the product tour. The artifact the model
   actually shipped with — services/ml-api/ensemble_weights.json — records a
   5-fold CV mean accuracy of 0.977…, and nothing anywhere in this repo produces
   98.9%. Alongside it, the site published per-model fusion weights of
   0.42 / 0.33 / 0.25; the same artifact records three exact thirds.

   The six rules above could not catch either one. They look for language that
   is never earned ("clinical-grade", "pilot") or for synthetic data wearing a
   live badge. This one was a plausible number in an honest-looking sentence,
   with its dataset, cohort and method correctly stated right beside it. The
   only thing wrong with it was that it was not true.

   So these rules do not pattern-match on wording. They read the artifact at
   test time and compare it against what the source publishes. If the model is
   retrained and the artifact changes, these tests track it; if the site drifts
   from the artifact, they fail. Nothing below hardcodes 97.7 or 1/3.
   ══════════════════════════════════════════════════════════════════════════ */

interface EnsembleArtifact {
  normalised_weights: number[];
  cv_results?: { mean_accuracy?: number };
  mean_accuracy?: number;
}

const ARTIFACT_PATH = path.join(REPO, "services/ml-api/ensemble_weights.json");

function artifact(): EnsembleArtifact {
  return JSON.parse(fs.readFileSync(ARTIFACT_PATH, "utf8")) as EnsembleArtifact;
}

/** The only model-accuracy percentage this repo is entitled to publish. */
function publishableAccuracyPct(a: EnsembleArtifact): number {
  const mean = a.cv_results?.mean_accuracy ?? a.mean_accuracy;
  if (typeof mean !== "number") throw new Error(`no mean_accuracy in ${ARTIFACT_PATH}`);
  return Number((mean * 100).toFixed(1));
}

/**
 * Words that turn a nearby number into a model-performance claim.
 *
 * Deliberately narrow. The UI is full of percentages — bar widths, override
 * rates, critical share, opacity — and a rule that flagged all of them would be
 * turned off within a week. A number is only a claim about the model if it sits
 * next to language about how well the model classifies.
 */
const ACCURACY_CONTEXT =
  /accurac|cross[-\s]?validat|\bfive[-\s]?fold\b|\b\d[-\s]?fold\b|\bCV\b|ensemble agreement|model agreement|\bAUROC\b|\bAUC\b|sensitivit|specificit/i;

/** Percent literals ("97.7%") and bare decimals in percent range ("pct={97.7}"). */
const PERCENTISH = /(\d{2,3}(?:\.\d+)?)\s*%|\b(\d{2,3}\.\d+)\b/g;

describe("claims: published numbers match the artifact the model shipped with", () => {
  it("no shipped file publishes a model-accuracy percentage the artifact does not support", () => {
    const expected = publishableAccuracyPct(artifact());
    const offenders: string[] = [];

    for (const f of shipped()) {
      const src = code(f);
      for (const m of src.matchAll(PERCENTISH)) {
        const value = Number(m[1] ?? m[2]);
        // Below 50% is not a plausible accuracy claim for a binary classifier
        // anyone would ship; above 100 is not a percentage at all.
        if (!Number.isFinite(value) || value < 50 || value > 100) continue;

        const around = src.slice(Math.max(0, m.index! - 110), m.index! + 110);
        if (!ACCURACY_CONTEXT.test(around)) continue;

        if (Math.abs(value - expected) > 0.05) {
          offenders.push(
            `${rel(f)}: publishes ${value} as model accuracy; ` +
              `ensemble_weights.json says ${expected}\n    …${around.replace(/\s+/g, " ").trim()}…`
          );
        }
      }
    }

    expect(
      offenders,
      `A performance number with no artifact behind it is a fabrication even when ` +
        `it is only 1.2 points off:\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  it("the accuracy ring on the landing page is read from the artifact's value", () => {
    // The positive half of the rule above. Deleting the number entirely would
    // satisfy a rule that only bans wrong values, so pin the one that ships.
    const src = code(path.join(SRC, "components/landing/SpeedAccuracyDuo.tsx"));
    const m = /const CV_ACCURACY_PCT = (\d+(?:\.\d+)?)/.exec(src);
    expect(m, "SpeedAccuracyDuo must declare CV_ACCURACY_PCT for the accuracy ring").not.toBeNull();
    expect(Number(m![1]), "the ring must show the artifact's 5-fold CV mean accuracy").toBe(
      publishableAccuracyPct(artifact())
    );
  });

  it("no shipped file claims per-model fusion weights the artifact does not record", () => {
    const expected = artifact().normalised_weights;
    expect(expected.length, "artifact must record per-model weights").toBeGreaterThan(0);

    // "weight: 0.42", "w: 0.42", "0.42 weight". Only decimals below 1, so
    // fontWeight: 500 and strokeWidth are out of scope by construction.
    const claims = [
      /\bweights?\s*[:=]\s*(0?\.\d+)/gi,
      /\bw\s*:\s*(0?\.\d+)/g,
      /(0?\.\d+)\s*weight\b/gi,
    ];

    const offenders: string[] = [];
    for (const f of shipped()) {
      const src = code(f);
      for (const re of claims) {
        for (const m of src.matchAll(re)) {
          const value = Number(m[1]);
          // Agreeing to two decimals is enough: 0.33 is an honest rendering of
          // a third, 0.42 is not an honest rendering of anything here.
          if (expected.some((w) => Math.abs(value - w) <= 0.005)) continue;
          const around = src.slice(Math.max(0, m.index! - 70), m.index! + 70);
          offenders.push(
            `${rel(f)}: claims fusion weight ${value}; ensemble_weights.json says ` +
              `[${expected.map((w) => w.toFixed(4)).join(", ")}]\n    …${around.replace(/\s+/g, " ").trim()}…`
          );
        }
      }
    }

    expect(
      offenders,
      `train.py's tanh weighting saturates on all three models, so the weights ` +
        `normalise to equal thirds. Distinct per-model weights are invented:\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  it("the traceable-score panel's votes still sum to the fused score it prints", () => {
    // TraceSections renders each model's contribution (p x weight) beside a
    // fused total. Changing the weights without recomputing the votes leaves a
    // panel whose arithmetic a reader can check and find wrong — which is the
    // same defect as publishing a number with no artifact behind it.
    const src = code(path.join(SRC, "components/landing/TraceSections.tsx"));
    const weights = artifact().normalised_weights;

    const votes = [...src.matchAll(/\bp:\s*(\d*\.\d+)/g)].map((m) => Number(m[1]));
    const fused = /const FUSED = (\d*\.\d+)/.exec(src);

    expect(votes.length, "TraceSections must declare one vote per ensemble model").toBe(weights.length);
    expect(fused, "TraceSections must declare FUSED").not.toBeNull();

    const sum = votes.reduce((acc, p, i) => acc + p * weights[i], 0);
    expect(
      sum.toFixed(2),
      `Illustrative votes [${votes.join(", ")}] fuse to ${sum.toFixed(4)}, but the ` +
        `panel prints ${fused![1]}. Recompute the votes, not the label.`
    ).toBe(Number(fused![1]).toFixed(2));
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   The ninth shape: a fabricated value inside the clinical app.

   The first eight were promotion — a landing page, a README, an analytics
   export. This one was in `supabase/functions/infer-cxr/index.ts`, and it did
   not describe the product to a visitor, it *was* the product:

     Path A  the three-model ensemble
     Path B  Gemini vision, if A fails
     Path C  syntheticFallback(), if B fails — `Math.random()`

   Path C returned a random `risk_score`, derived a `risk_bucket` from it,
   attached a random `confidence`, and answered HTTP 200. The client could not
   tell it apart from a real score, wrote it to `triage_results`, and the
   worklist ordered a radiologist's reading queue by it. A real patient's chest
   X-ray could be placed first, or last, on a coin flip. The only disclosure was
   `model_version: 'synthetic-fallback'` in a side panel — not on the worklist
   row, which is where the ordering acts.

   Every rule above this comment scans `src/` and nothing else. That is exactly
   why none of them saw it. These three do not pattern-match on wording either;
   they read every edge function and look for a random number reaching a
   clinical field.
   ══════════════════════════════════════════════════════════════════════════ */

/** Every .ts under supabase/functions/, excluding tests. */
const edgeFunctions = () => sourceFiles(EDGE_FUNCTIONS, []);

/**
 * Names that make a nearby number a clinical value.
 *
 * The triage fields are the ones that order the queue; the analytes are there
 * because a simulated blood gas is still a clinical value, and the lab panel in
 * this same function used to carry `Math.random()` jitter that made six
 * deterministic curves look like six independent observations.
 */
const CLINICAL_FIELD =
  /risk_score|riskScore|risk_bucket|riskBucket|confidence|severity|triage|probabilit|\bco2\b|\bph\b|\bo2\b|\bwbc\b|\bcrp\b|procalcitonin/i;

/** Anything that produces a number no measurement stands behind. */
const RANDOM_SOURCE = /Math\s*\.\s*random\s*\(|crypto\s*\.\s*getRandomValues\s*\(/g;

describe("claims: no edge function invents a clinical value", () => {
  it("finds the edge functions it is supposed to be scanning", () => {
    // A rule that silently scans nothing passes forever. `shipped()` scanned
    // src/ only, which is how Path C survived; this asserts the new scan has a
    // corpus, and that the function Path C lived in is inside it.
    const files = edgeFunctions().map(rel);
    expect(files.length, "no edge functions found to scan").toBeGreaterThan(3);
    expect(files).toContain("supabase/functions/infer-cxr/index.ts");
  });

  it("no random number reaches a clinical field", () => {
    const offenders: string[] = [];

    for (const f of edgeFunctions()) {
      const src = code(f);
      for (const m of src.matchAll(RANDOM_SOURCE)) {
        const around = src.slice(Math.max(0, m.index! - 200), m.index! + 200);
        if (!CLINICAL_FIELD.test(around)) continue;
        offenders.push(
          `${rel(f)}: a random number is generated beside a clinical field\n    …${around
            .replace(/\s+/g, " ")
            .trim()}…`
        );
      }
    }

    expect(
      offenders,
      `A score, bucket, confidence or lab value produced by a random number is ` +
        `a fabrication the moment it is written to triage_results and a ` +
        `radiologist's queue is ordered by it:\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  it("no edge function uses Math.random() at all", () => {
    // Broader than the rule above on purpose, and cheap to keep true. There is
    // no legitimate server-side use here: an edge function in this app has no
    // skeleton loaders and no decorative motion, so everything it returns is
    // either a measurement or an input to a patient's record. The narrower rule
    // is the one that explains *why* a hit is wrong; this one closes the gap
    // where a random value is laundered through an intermediate variable far
    // enough away to fall outside the window.
    const offenders = edgeFunctions()
      .filter((f) => /Math\s*\.\s*random\s*\(/.test(code(f)))
      .map(rel);

    expect(
      offenders,
      `Math.random() in an edge function. Nothing these return is decorative:` +
        `\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  it("infer-cxr has no third path and no synthetic model version", () => {
    // The structural half. A future Path C need not use Math.random() to be the
    // same defect — any substitute score is. These pin the shape by name: the
    // function, the model_version string the client would store, and the
    // "Simulated analysis" finding it shipped alongside them.
    const src = code(path.join(EDGE_FUNCTIONS, "infer-cxr", "index.ts"));

    expect(src, "syntheticFallback must not return").not.toMatch(/syntheticFallback/);
    expect(src, "no synthetic-fallback model_version may be reported as a score")
      .not.toMatch(/synthetic[- ]fallback/i);
    expect(src, "a failed inference must not be described as an analysis")
      .not.toMatch(/Simulated analysis/i);

    // A failed inference must be distinguishable by the client. Both halves:
    // a non-2xx status and an explicit flag.
    expect(src, "infer-cxr must answer a failed inference with a non-2xx status")
      .toMatch(/status:\s*503/);
    expect(src, "infer-cxr must flag unscored responses explicitly")
      .toMatch(/scored:\s*false/);
  });
});

describe("claims: the triage bands are defined in one place", () => {
  /**
   * Three files carried three different REVIEW floors:
   *
   *   - the Gemini system prompt documented 0.30
   *   - the edge function bucketed at 0.35
   *   - inference.py declared 0.35 and then overrode it at the point of use
   *     with the ensemble's own `optimal_threshold`, which the artifact records
   *     as 0.50 — so the band that actually ran was 0.50–0.65 and no file said so
   *
   * The artifact is the authority, read here at test time. Retraining moves
   * these assertions; drifting from the artifact breaks them.
   */
  const edgeSrc = () => code(path.join(EDGE_FUNCTIONS, "infer-cxr", "index.ts"));
  const pySrc = () => pyCode(path.join(REPO, "services/ml-api/inference.py"));

  it("the edge function's REVIEW floor is the artifact's optimal_threshold", () => {
    const expected = (artifact() as { optimal_threshold?: number }).optimal_threshold;
    expect(typeof expected, `ensemble_weights.json must record optimal_threshold`).toBe("number");

    const m = /const REVIEW_THRESHOLD\s*=\s*(\d*\.?\d+)/.exec(edgeSrc());
    expect(m, "infer-cxr must declare REVIEW_THRESHOLD").not.toBeNull();
    expect(
      Number(m![1]),
      `infer-cxr buckets at ${m![1]} but the ensemble was fitted at ${expected}. ` +
        `Two paths writing risk_bucket with different boundaries is not a fallback.`
    ).toBe(expected);
  });

  it("the CRITICAL boundary is the same number in both runtimes", () => {
    const edge = /const CRITICAL_THRESHOLD\s*=\s*(\d*\.?\d+)/.exec(edgeSrc());
    const py = /^CRITICAL_THRESHOLD\s*=\s*(\d*\.?\d+)/m.exec(pySrc());
    expect(edge, "infer-cxr must declare CRITICAL_THRESHOLD").not.toBeNull();
    expect(py, "inference.py must declare CRITICAL_THRESHOLD").not.toBeNull();
    expect(
      Number(edge![1]),
      `infer-cxr says ${edge![1]}, inference.py says ${py![1]}`
    ).toBe(Number(py![1]));
  });

  it("the Gemini prompt documents the bands the code applies", () => {
    // The prompt is interpolated from the constants rather than restating them,
    // so it cannot drift. This asserts that, not the rendered text: a literal
    // band edge typed into the prompt is the defect coming back.
    const src = edgeSrc();
    const prompt = /SCORING[\s\S]*?OUTPUT FORMAT/.exec(src);
    expect(prompt, "infer-cxr must document its scoring bands to the model").not.toBeNull();

    expect(
      prompt![0],
      "the prompt must interpolate REVIEW_THRESHOLD, not restate a number"
    ).toContain("${REVIEW_THRESHOLD}");
    expect(
      prompt![0],
      "the prompt must interpolate CRITICAL_THRESHOLD, not restate a number"
    ).toContain("${CRITICAL_THRESHOLD}");
    expect(
      /\b0\.\d\d\b/.test(prompt![0]),
      `the prompt still contains a literal band edge:\n${prompt![0]}`
    ).toBe(false);
  });

  it("inference.py measures confidence against the threshold it buckets with", () => {
    // `confidence` used the module constant while the bucket used the
    // ensemble's, so a score sitting exactly on the real decision boundary was
    // reported at 0.82 confidence. Both must read the same accessor.
    const src = pySrc();
    expect(src, "inference.py must resolve the REVIEW floor through one accessor")
      .toMatch(/review_thresh\s*=\s*review_threshold_of\(ensemble\)/);

    const dist = /dist = min\(([\s\S]*?)\n\s*\)/.exec(src);
    expect(dist, "inference.py must compute the confidence distance").not.toBeNull();
    expect(
      dist![1],
      "the confidence distance must be measured against the resolved threshold"
    ).toContain("review_thresh");
    expect(
      dist![1],
      "the confidence distance must not use a hardcoded REVIEW constant"
    ).not.toContain("REVIEW_THRESHOLD");
  });

  it("Grad-CAM does not put the models into training mode", () => {
    // `.train()` switched BatchNorm to batch statistics on a batch of one AND
    // updated its running buffers in place, so the heatmap explained a
    // different function from the score and the model drifted with every
    // request. Gradients never required it.
    const src = pySrc();
    expect(src, "inference.py must not call .train() — eval() supports Grad-CAM")
      .not.toMatch(/\.train\(\)/);
    expect(src, "the Grad-CAM input must be the thing that requires grad")
      .toMatch(/canonical\.requires_grad_\(True\)/);
  });
});

describe("the product tour's ensemble panel adds up", () => {
  const tour = fs.readFileSync("src/components/landing/AppTourDemo.tsx", "utf8");

  it("computes the fused score from the per-model votes rather than typing it", () => {
    // The fused figure was a hand-typed literal beside three votes that did not
    // average to it — twice. Deriving it makes that impossible.
    expect(tour).toMatch(/const FUSED\s*=\s*Math\.round\(\(MODELS\.reduce/);
    // Anchored to the panel's "fused" label. The first version of this matched
    // the caption's `${FUSED.toFixed(2)}` too, so hardcoding the panel back to a
    // literal still passed — a guard that checked nothing.
    expect(tour, "the fused panel must render FUSED, not a literal")
      .toMatch(/>fused<\/span>\s*<span[^>]*>\{FUSED\.toFixed\(2\)\}<\/span>/);
    expect(tour, "the target study's score must be the fused score")
      .toMatch(/score:\s*FUSED\s*\}/);
  });

  it("uses equal weights, matching ensemble_weights.json", () => {
    const votes = [...tour.matchAll(/name: "(densenet121|googlenet|resnet18)", score: ([0-9.]+)/g)]
      .map(m => Number(m[2]));
    expect(votes).toHaveLength(3);
    const fused = Math.round((votes.reduce((a, b) => a + b, 0) / 3) * 100) / 100;
    // A CRITICAL example must actually land in the CRITICAL band.
    expect(fused).toBeGreaterThanOrEqual(0.65);
    for (const v of votes) expect(v).toBeLessThanOrEqual(1);
  });
});

describe("footer copy makes no regulatory or compliance claim it cannot back", () => {
  const pages = fs.readdirSync("src/pages").filter(f => f.endsWith(".tsx")).map(f => `src/pages/${f}`);
  const strip = (p: string) =>
    fs.readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it.each(pages)("%s does not claim clinical decision support", (p) => {
    // The Cures Act §3060 CDS exclusion does not apply to software that analyses
    // a medical image, and "for … only" implies clinical use. This line sat on
    // seven pages, including Login and Signup.
    expect(strip(p)).not.toMatch(/for clinical decision support only/i);
  });

  it.each(pages)("%s does not list HIPAA compliance", (p) => {
    // Kroix handles no patient data and has no BAA-covered infrastructure.
    expect(strip(p)).not.toMatch(/HIPAA Compliance/);
  });
});
