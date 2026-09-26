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
 * A claims rule, living here because this file already enumerates the clinical
 * surfaces.
 *
 * `lab_results` is a closed-form function of the risk score computed in
 * `infer-cxr`. No model and no blood draw is involved, and nothing could derive
 * a blood test from a radiograph. CLAUDE.md recorded this as open on two
 * surfaces, `PreviewPanel.tsx` and the worklist `Labs` column — both of which
 * have since been consolidated away, so the gap closed by deletion rather than
 * by a fix. That is exactly the kind of thing that silently reopens the next
 * time someone adds a panel, so the invariant is stated here instead of being
 * remembered.
 */
const LAB_FIELDS = /\.labs[.?]\s*(wbc|crp|procalcitonin|co2|ph|o2)\b/;
const LAB_COMPONENT = /<LabFlags\b/;
const SIMULATED_LABEL = /Simulated\s*—\s*not a real lab draw/;

/** Does this file render lab figures, as opposed to merely passing them along? */
const rendersLabs = (src: string) => LAB_FIELDS.test(src) || LAB_COMPONENT.test(src);

describe("simulated lab values are labelled wherever they are rendered", () => {
  it.each(CLINICAL_FILES)("%s", (file) => {
    const src = read(file);
    if (!rendersLabs(src)) return;

    expect(
      SIMULATED_LABEL.test(src),
      `${file} renders lab values but carries no "Simulated — not a real lab draw" ` +
      `label. These are a closed-form function of the risk score, not a blood ` +
      `draw — see CLAUDE.md, Public claims.`,
    ).toBe(true);
  });

  it("at least two surfaces are actually covered by that rule", () => {
    // Guards the guard: if the detection regexes stop matching anything, the
    // it.each above passes vacuously for every file and asserts nothing.
    const covered = CLINICAL_FILES.filter((f) => rendersLabs(read(f)));
    expect(
      covered,
      "expected StudyPreview and Reviewer to be detected as rendering labs",
    ).toEqual(expect.arrayContaining([
      "src/components/dashboard/StudyPreview.tsx",
      "src/pages/Reviewer.tsx",
    ]));
  });
});
