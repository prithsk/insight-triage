import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve, join } from "path";

/**
 * Two guards on the clinical app, both static source analysis in the idiom of
 * `claims.test.ts` and `rls.test.ts`. Neither renders anything.
 *
 * 1. THE PALETTE. CLAUDE.md says `kx-*` tokens only. On 2026-09-26 the clinical
 *    surfaces held 63 raw Tailwind colour utilities between them — `text-red-600`,
 *    `bg-amber-50`, `from-zinc-800` — which is why the inner app looked unrelated
 *    to the landing page it shares a design system with. Worse for a clinical
 *    tool: `red-600` and `kx-critical` are different reds, so severity read as two
 *    different colours depending on which component drew it.
 *
 * 2. LOCALISATION. `StudyPreview` drew an "Area of Interest" chip over the
 *    patient's radiograph whenever `risk_bucket !== "CLEAR"` — with no check that
 *    any localisation existed. Gemini's path returns none at all. That is a
 *    localisation claim with nothing behind it, the same shape as the
 *    `buildLegacyHeatmap()` ROI circles removed on 2026-09-25, and CI's existing
 *    rule only watches `Reviewer.tsx`.
 */

const ROOT = resolve(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

/**
 * Source with comments removed. Several rules below forbid a literal that these
 * files legitimately QUOTE while explaining why it was removed — the first
 * version of the lab-source rule failed against its own docstring. Assertions
 * about what the code does must read the code.
 */
const readCode = (p: string) =>
  read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Every surface behind the auth gate. The landing page is deliberately out of
 *  scope — it has its own palette and its own file. */
const CLINICAL_FILES = [
  ...readdirSync(join(ROOT, "src/components/dashboard")).map(f => `src/components/dashboard/${f}`),
  ...readdirSync(join(ROOT, "src/components/reviewer")).map(f => `src/components/reviewer/${f}`),
  "src/pages/Index.tsx",
  "src/pages/Reviewer.tsx",
  "src/pages/Analytics.tsx",
  "src/pages/Assistant.tsx",
  "src/pages/PendingApproval.tsx",
  "src/components/ProtectedRoute.tsx",
].filter(f => f.endsWith(".tsx"));

const TAILWIND_PALETTE =
  "red|green|blue|yellow|orange|amber|slate|gray|zinc|emerald|rose|sky|" +
  "indigo|purple|teal|cyan|lime|violet|fuchsia|pink|stone|neutral";

const RAW_COLOUR = new RegExp(
  `(?<![\w-])(?:text|bg|border|from|via|to|ring|divide|outline|shadow|fill|stroke|accent|caret|decoration)-(?:${TAILWIND_PALETTE})-[0-9]{2,3}(?![\w])`,
  "g",
);

describe("clinical surfaces use kx tokens, not raw Tailwind colours", () => {
  it.each(CLINICAL_FILES)("%s", (file) => {
    const hits = [...read(file).matchAll(RAW_COLOUR)].map(m => m[0]);
    expect(
      hits,
      `${file} uses raw Tailwind colours: ${[...new Set(hits)].join(", ")}. ` +
      `Use kx-* tokens — kx-critical for a severity FILL, kx-critical-ink for ` +
      `severity TEXT (kx-critical is 3.7:1 on white and fails SC 1.4.3), ` +
      `kx-warn for approaching, kx-accent3 for clear.`,
    ).toEqual([]);
  });

  it("covers every dashboard and reviewer component, so a new file is not exempt", () => {
    // The list is built by reading the directories rather than hardcoded, so a
    // component added tomorrow is covered without anyone remembering to add it.
    expect(CLINICAL_FILES.length).toBeGreaterThan(5);
    expect(CLINICAL_FILES).toContain("src/pages/Index.tsx");
    expect(CLINICAL_FILES.some(f => f.startsWith("src/components/dashboard/"))).toBe(true);
  });
});

describe("no localisation is claimed without a heatmap behind it", () => {
  it("StudyPreview gates the Area of Interest chip on roi_heatmap_path", () => {
    const src = read("src/components/dashboard/StudyPreview.tsx");
    const chip = src.indexOf("AREA_OF_INTEREST");
    expect(chip, "StudyPreview should still render the chip somewhere").toBeGreaterThan(-1);

    // Walk back to the condition guarding it.
    const guard = src.lastIndexOf("{item.triage", chip);
    expect(guard).toBeGreaterThan(-1);
    const condition = src.slice(guard, chip);

    expect(condition, "the chip must be gated on a heatmap existing")
      .toMatch(/roi_heatmap_path/);
    expect(condition, "the chip must NOT be gated on the risk bucket alone")
      .not.toMatch(/risk_bucket\s*!==\s*"CLEAR"/);
  });

  it("no clinical surface renders a localisation chip off the bucket alone", () => {
    for (const file of CLINICAL_FILES) {
      const src = read(file);
      if (!src.includes("AREA_OF_INTEREST")) continue;
      const idx = src.indexOf("AREA_OF_INTEREST");
      const window = src.slice(Math.max(0, idx - 400), idx);
      if (/risk_bucket\s*!==\s*"CLEAR"/.test(window)) {
        expect.fail(
          `${file} appears to show a localisation label based on risk bucket ` +
          `rather than on a heatmap existing. That is a localisation claim with ` +
          `nothing behind it — see CLAUDE.md, Public claims.`,
        );
      }
    }
  });
});

/**
 * No lab values in the clinical app — not labelled ones, none.
 *
 * `lab_results` was a closed-form function of the risk score computed in
 * `infer-cxr`: no model and no blood draw, and nothing that could be derived
 * from a radiograph. On 2026-09-26 it was labelled "Simulated — not a real lab
 * draw" everywhere it rendered; on 2026-10-04 it was removed, because a label
 * makes a fabricated value honest to read without making it any less
 * fabricated. These rules keep it out at every layer that produced or showed it.
 */
// `labs.wbc`, `labs?.wbc` and `labs['wbc']` all count. The first version took one
// character between `labs` and the field, so optional chaining walked past it.
const LAB_FIELDS = /\.labs\s*(\?\.|\.|\??\.?\[\s*['"])\s*(wbc|crp|procalcitonin|co2|ph|o2)\b/;
const LAB_COMPONENT = /<LabFlags\b|lab-flags/;

describe("no lab values are produced or shown", () => {
  it.each(CLINICAL_FILES)("%s renders no lab figures", (file) => {
    const code = readCode(file);
    expect(LAB_FIELDS.test(code) || LAB_COMPONENT.test(code),
      `${file} renders lab values. Kroix cannot measure them — see CLAUDE.md, Public claims.`).toBe(false);
  });

  it("the detection would have matched the panels it replaced", () => {
    // Guards the guard: the old Reviewer and StudyPreview panels, verbatim
    // shapes, must trip the rule, or the it.each above checks nothing.
    expect(LAB_FIELDS.test("{item.labs.wbc}")).toBe(true);
    expect(LAB_FIELDS.test("{item.labs?.crp}")).toBe(true);
    expect(LAB_FIELDS.test("{item.labs['o2']}")).toBe(true);
    expect(LAB_COMPONENT.test("<LabFlags labs={item.labs} />")).toBe(true);
  });

  it("infer-cxr computes and returns no lab values", () => {
    const fn = readCode("supabase/functions/infer-cxr/index.ts");
    expect(fn).not.toMatch(/simulateLabValues|lab_values/);
  });

  it("nothing writes lab rows", () => {
    for (const f of ["src/hooks/useUploadDicom.ts", "scripts/seed-demo.mjs"]) {
      expect(readCode(f), `${f} must not insert into lab_results`).not.toMatch(/from\(["']lab_results["']\)/);
    }
  });
});

/**
 * Guards on what the inner app claims, found by looking at four screenshots of
 * the rendered dashboard on 2026-09-28. Every one of them had passed typecheck,
 * tests, and a build. None of them were visible from the source alone without
 * knowing what to look for.
 */
describe("the reviewer does not offer control over evidence it does not have", () => {
  const src = read("src/pages/Reviewer.tsx");

  it("gates the ROI toggle and opacity slider on localization existing", () => {
    // They rendered unconditionally, so a study with no region map showed a live
    // "Show Area of Interest" switch set on and a 70% opacity slider directly
    // above the sentence "No localization for this study".
    const controls = src.indexOf("Show {LANGUAGE.AREA_OF_INTEREST}");
    expect(controls).toBeGreaterThan(-1);
    const guard = src.lastIndexOf("hasLocalization", controls);
    expect(guard, "the ROI controls must sit inside a hasLocalization branch").toBeGreaterThan(-1);
    // Nothing may close that branch between the guard and the control.
    expect(src.slice(guard, controls)).not.toMatch(/\)\}\s*$/);
  });
});

describe("the assistant does not claim evidence it has not retrieved", () => {
  const src = read("src/pages/Assistant.tsx");

  it("does not state 'evidence-based' unconditionally", () => {
    // `rag-assistant` appends retrieved context only `if (ragContext)`; with an
    // empty knowledge base it omits the block and answers from the general
    // model's training data anyway.
    const hardcoded = /Evidence-based clinical knowledge\./.test(src)
      && !/hasKnowledgeBase/.test(src);
    expect(hardcoded, "the claim must depend on whether documents exist").toBe(false);
    expect(src).toMatch(/hasKnowledgeBase/);
  });

  it("says plainly which model answered, and that it is not the ensemble", () => {
    expect(src, "the ensemble scores images; it does not answer questions")
      .toMatch(/Not the Kroix ensemble/);
  });
});

describe("analytics measures the thing the product claims to move", () => {
  const src = read("src/pages/Analytics.tsx");

  it("does not present throughput as a Kroix metric", () => {
    // Kroix reorders a queue; it does not make anyone read faster, and the SLA
    // replay holds throughput FIXED because that is the only way the comparison
    // means anything. A scans/hr tile invites the reading that Kroix moves it —
    // the shape of the chart torn off the landing page on 2026-07-30.
    expect(readCode("src/pages/Analytics.tsx"), "scans/hr must not appear as a metric")
      .not.toMatch(/scans\/hr/);
  });

  it("shows read-time target attainment", () => {
    expect(src).toMatch(/Read Inside Target/);
    expect(src).toMatch(/useTargetMetrics/);
  });

  it("computes 'late' from the SLA replay engine rather than redefining it", () => {
    const hook = read("src/hooks/useTargetMetrics.ts");
    expect(hook, "breached() must be imported, not reimplemented")
      .toMatch(/import \{[^}]*breached[^}]*\} from "@\/validation\/slaReplay"/);
    expect(hook, "a metric that cannot fail is a sales prop").toMatch(/missed/);
  });

  it("does not imply a without-Kroix comparison", () => {
    expect(src).not.toMatch(/withoutKroix/);
  });
});

describe("read time is recorded by the database, not inferred", () => {
  it("analytics times reads by reviewed_at and never falls back to updated_at", () => {
    // updated_at moved on any later edit and was supplied by the browser.
    // A fallback to it would put the proxy back under a new name.
    const hook = readCode("src/hooks/useTargetMetrics.ts");
    expect(hook).toMatch(/reviewed_at/);
    expect(hook, "updated_at must not be used as a read time").not.toMatch(/updated_at/);
  });

  it("the client does not send its own clock when marking a study reviewed", () => {
    const studies = readCode("src/hooks/useStudies.ts");
    expect(studies).not.toMatch(/status:\s*'REVIEWED'[^}]*updated_at/);
  });

  it("a trigger owns reviewed_at and ignores client-supplied values", () => {
    const sql = read("supabase/migrations/20261004120000_studies_reviewed_at.sql");
    expect(sql).toMatch(/BEFORE INSERT OR UPDATE ON public\.studies/);
    expect(sql, "on update, start from the stored value").toMatch(/NEW\.reviewed_at\s*:=\s*OLD\.reviewed_at/);
    expect(sql, "no backfill from the proxy").not.toMatch(/SET\s+reviewed_at\s*=\s*updated_at/i);
  });
});

describe("confidence is not presented as a measurement", () => {
  it.each(CLINICAL_FILES)("%s does not render triage confidence as a percentage", (file) => {
    // `confidence` is a monotone function of distance to the nearest decision
    // boundary: the score restated, never calibrated against outcomes. Shown as
    // "Confidence: 88%" it reads as a measured probability of being right.
    expect(readCode(file)).not.toMatch(/\.confidence\s*\*\s*100/);
  });
});
