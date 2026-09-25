import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Claim discipline, enforced.
 *
 * Seven fabricated claims shipped to the public site over this project's life:
 *
 *   1. a `Math.random()` "scans reviewed per hour, with vs. without Kroix"
 *      chart under a `LIVE · 7-DAY` badge
 *   2. a testimonial attributed to "Pilot deployment, regional imaging network"
 *   3. "Clinical-grade accuracy" and a `VALIDATED` badge over a 5-fold CV number
 *   4. "Currently in active pilot testing" in README.md
 *   5. a synthetic "without Kroix" comparison arm in useAnalytics, exported to CSV
 *   6. `Math.random()` scores under the heading "Live worklist" with a pulsing dot
 *   7. a headline accuracy of 98.9% and fusion weights of 0.42 / 0.33 / 0.25,
 *      neither of which appears in `services/ml-api/ensemble_weights.json` — the
 *      artifact the shipped model came with (0.977… and three exact thirds)
 *
 * Every one of them typechecked. Every one was found by a human reading the
 * source, and several survived multiple review passes precisely because
 * "typecheck passes" was mistaken for "this is true". This file is the first
 * automated gate on the class.
 *
 * It is deliberately a static scan of source text rather than a behavioural
 * test: the failure mode is a claim being WRITTEN, so the source is the right
 * place to catch it. It cannot catch a novel phrasing — nothing can — but it
 * makes reintroducing any of the seven shapes above a failing build.
 *
 * The last block reads `services/ml-api/ensemble_weights.json` at test time
 * rather than hardcoding what it currently says, so retraining the model moves
 * the assertion instead of breaking it.
 */

const SRC = path.resolve(__dirname);
const REPO = path.resolve(__dirname, "..");

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
