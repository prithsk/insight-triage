import { describe, it, expect } from "vitest";
import {
  extractImpression,
  isChestRadiograph,
  bandFromReport,
  adaptMimicRows,
  toWorklistCsv,
  type MimicRadiologyRow,
} from "./mimicAdapter";

/**
 * Report text shaped like MIMIC's: capitalised section headers, free text bodies.
 * These are hand-written approximations, not real MIMIC content — no credentialed
 * data belongs in a public repo.
 */

const REPORT_NORMAL = `
EXAMINATION:  CHEST (PA AND LAT)

INDICATION:  Shortness of breath.

COMPARISON:  None.

FINDINGS:  The lungs are clear. Heart size is normal. No pleural effusion.

IMPRESSION:  No acute cardiopulmonary process.
`;

const REPORT_MEDIUM = `
EXAMINATION:  CHEST (PA AND LAT)

FINDINGS:  There is a small left pleural effusion with associated atelectasis.

IMPRESSION:  Small left pleural effusion.
`;

const REPORT_CRITICAL = `
EXAMINATION:  CHEST (PORTABLE AP)

IMPRESSION:  Large right pneumothorax with mediastinal shift.
`;

const REPORT_CT = `
EXAMINATION:  CT CHEST WITH CONTRAST

IMPRESSION:  Pulmonary nodule in the right upper lobe.
`;

const REPORT_NO_SECTIONS = `
Some free text with no recognisable header structure at all.
`;

describe("extractImpression", () => {
  it("prefers IMPRESSION", () => {
    expect(extractImpression(REPORT_MEDIUM)).toBe("Small left pleural effusion.");
  });

  it("falls back to FINDINGS when IMPRESSION is absent", () => {
    const text = "EXAMINATION: CHEST\n\nFINDINGS:  Patchy right base opacity.\n";
    expect(extractImpression(text)).toBe("Patchy right base opacity.");
  });

  it("collapses the multi-line whitespace MIMIC reports are full of", () => {
    const text = "IMPRESSION:\n  Small left\n  pleural effusion.\n";
    expect(extractImpression(text)).toBe("Small left pleural effusion.");
  });

  it("stops at the next section header rather than swallowing the rest", () => {
    const text = "IMPRESSION:  Effusion.\n\nRECOMMENDATION:  Follow up in 3 months.\n";
    expect(extractImpression(text)).toBe("Effusion.");
  });

  it("returns empty string when no section exists, so the row can be skipped", () => {
    expect(extractImpression(REPORT_NO_SECTIONS)).toBe("");
  });
});

describe("isChestRadiograph", () => {
  it("accepts PA and lateral chest", () => {
    expect(isChestRadiograph(REPORT_MEDIUM)).toBe(true);
  });

  it("accepts portable chest films", () => {
    expect(isChestRadiograph(REPORT_CRITICAL)).toBe(true);
  });

  it("rejects CT chest, which has different read-time expectations entirely", () => {
    expect(isChestRadiograph(REPORT_CT)).toBe(false);
  });

  it("uses the exam name when supplied", () => {
    expect(isChestRadiograph("no modality words here", "CHEST X-RAY")).toBe(true);
    expect(isChestRadiograph("no modality words here", "MRI BRAIN")).toBe(false);
  });
});

describe("bandFromReport", () => {
  it("calls a large pneumothorax critical", () => {
    expect(bandFromReport("Large right pneumothorax with mediastinal shift.")).toBe("critical");
  });

  it("calls tube malposition critical", () => {
    expect(bandFromReport("Endotracheal tube malposition.")).toBe("critical");
  });

  it("calls a clean study routine", () => {
    expect(bandFromReport("No acute cardiopulmonary process.")).toBe("routine");
    expect(bandFromReport("Clear lungs. Unremarkable.")).toBe("routine");
  });

  it("puts an effusion in the medium band under study", () => {
    expect(bandFromReport("Small left pleural effusion.")).toBe("medium");
  });

  it("defaults unrecognised text to medium, which dilutes rather than inflates", () => {
    // Over-assigning to medium weakens any measured effect. That is the safe error.
    expect(bandFromReport("Some finding nobody wrote a rule for.")).toBe("medium");
  });
});

describe("adaptMimicRows", () => {
  const base = (over: Partial<MimicRadiologyRow> = {}): MimicRadiologyRow => ({
    note_id: "N1",
    subject_id: "S1",
    charttime: "2150-03-04 10:00:00",
    storetime: "2150-03-04 12:30:00",
    text: REPORT_MEDIUM,
    ...over,
  });

  it("converts a usable row and preserves the interval", () => {
    const { rows } = adaptMimicRows([base()]);
    expect(rows).toHaveLength(1);
    const wait = Date.parse(rows[0].readAt) - Date.parse(rows[0].arrivedAt);
    expect(wait).toBe(2.5 * 60 * 60 * 1000);
    expect(rows[0].band).toBe("medium");
  });

  it("drops rows with a null storetime rather than guessing a read time", () => {
    // storetime is nullable in the schema; inventing one would fabricate latency.
    const { rows, skipped } = adaptMimicRows([base({ storetime: undefined })]);
    expect(rows).toHaveLength(0);
    expect(skipped[0].reason).toMatch(/null storetime/);
  });

  it("drops storetime-before-charttime as bad data", () => {
    const { rows, skipped } = adaptMimicRows([
      base({ charttime: "2150-03-04 12:00:00", storetime: "2150-03-04 10:00:00" }),
    ]);
    expect(rows).toHaveLength(0);
    expect(skipped[0].reason).toMatch(/before charttime/);
  });

  it("drops non-CXR modalities", () => {
    const { rows, skipped } = adaptMimicRows([base({ text: REPORT_CT })]);
    expect(rows).toHaveLength(0);
    expect(skipped[0].reason).toMatch(/not a chest radiograph/);
  });

  it("drops reports with no extractable section", () => {
    // Passing an exam name so it clears the modality filter and reaches the
    // section check — otherwise this would test the wrong rejection.
    const { rows, skipped } = adaptMimicRows(
      [base({ text: REPORT_NO_SECTIONS })],
      new Map([["N1", "CHEST (PA AND LAT)"]])
    );
    expect(rows).toHaveLength(0);
    expect(skipped[0].reason).toMatch(/no IMPRESSION/);
  });

  it("accounts for every input row as either adapted or skipped", () => {
    const input = [
      base({ note_id: "A", text: REPORT_MEDIUM }),
      base({ note_id: "B", text: REPORT_NORMAL }),
      base({ note_id: "C", text: REPORT_CT }),
      base({ note_id: "D", storetime: undefined }),
    ];
    const { rows, skipped } = adaptMimicRows(input);
    expect(rows.length + skipped.length).toBe(4);
  });

  it("assigns bands across the spread", () => {
    const { rows } = adaptMimicRows([
      base({ note_id: "A", text: REPORT_NORMAL }),
      base({ note_id: "B", text: REPORT_MEDIUM }),
      base({ note_id: "C", text: REPORT_CRITICAL }),
    ]);
    expect(rows.map((r) => r.band)).toEqual(["routine", "medium", "critical"]);
  });
});

describe("toWorklistCsv", () => {
  it("emits a header the worklist parser understands", () => {
    const { rows } = adaptMimicRows([
      {
        note_id: "N1",
        subject_id: "S1",
        charttime: "2150-03-04 10:00:00",
        storetime: "2150-03-04 12:30:00",
        text: REPORT_MEDIUM,
      },
    ]);
    const csv = toWorklistCsv(rows);
    expect(csv.split("\n")[0]).toBe("study_id,arrived_at,read_at,band,finding,modality");
    expect(csv.split("\n")[1]).toContain("N1");
  });

  it("cannot be broken by quotes in report text", () => {
    const csv = toWorklistCsv([
      {
        studyId: "N1",
        arrivedAt: "2150-03-04T10:00:00.000Z",
        readAt: "2150-03-04T12:00:00.000Z",
        band: "medium",
        finding: 'effusion with "quoted" text',
        modality: "CXR",
      },
    ]);
    // One data line, and the embedded quotes are gone rather than escaping early.
    expect(csv.trim().split("\n")).toHaveLength(2);
    expect(csv).not.toContain('"quoted"');
  });
});
