import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Claim discipline, enforced.
 *
 * Six fabricated claims shipped to the public site over this project's life:
 *
 *   1. a `Math.random()` "scans reviewed per hour, with vs. without Kroix"
 *      chart under a `LIVE · 7-DAY` badge
 *   2. a testimonial attributed to "Pilot deployment, regional imaging network"
 *   3. "Clinical-grade accuracy" and a `VALIDATED` badge over a 5-fold CV number
 *   4. "Currently in active pilot testing" in README.md
 *   5. a synthetic "without Kroix" comparison arm in useAnalytics, exported to CSV
 *   6. `Math.random()` scores under the heading "Live worklist" with a pulsing dot
 *
 * Every one of them typechecked. Every one was found by a human reading the
 * source, and several survived multiple review passes precisely because
 * "typecheck passes" was mistaken for "this is true". This file is the first
 * automated gate on the class.
 *
 * It is deliberately a static scan of source text rather than a behavioural
 * test: the failure mode is a claim being WRITTEN, so the source is the right
 * place to catch it. It cannot catch a novel phrasing — nothing can — but it
 * makes reintroducing any of the six shapes above a failing build.
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
