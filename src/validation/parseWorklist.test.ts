import { describe, it, expect } from "vitest";
import {
  parseWorklistCsv,
  splitCsvLine,
  parseTime,
  bandFromPriority,
  bandFromFinding,
} from "./parseWorklist";
import type { Band } from "./slaReplay";

/**
 * A parser that silently drops rows would change the breach counts and nobody
 * would notice. Every exclusion here must be reported, and the tests below exist
 * mainly to prove that nothing vanishes quietly.
 */

const score = ({ band }: { band: Band }) => ({ critical: 0.9, medium: 0.55, routine: 0.15 }[band]);

describe("splitCsvLine", () => {
  it("splits plain fields and trims", () => {
    expect(splitCsvLine("a, b ,c")).toEqual(["a", "b", "c"]);
  });

  it("respects quoted fields containing commas", () => {
    expect(splitCsvLine('a,"b,c",d')).toEqual(["a", "b,c", "d"]);
  });

  it("handles escaped quotes", () => {
    expect(splitCsvLine('a,"say ""hi""",b')).toEqual(["a", 'say "hi"', "b"]);
  });

  it("preserves empty trailing fields", () => {
    expect(splitCsvLine("a,b,")).toEqual(["a", "b", ""]);
  });
});

describe("parseTime", () => {
  it("accepts ISO", () => {
    expect(parseTime("2026-03-04T14:22:01Z")).toBe(Date.parse("2026-03-04T14:22:01Z"));
  });

  it("accepts SQL-style space-separated timestamps", () => {
    expect(Number.isNaN(parseTime("2026-03-04 14:22:01"))).toBe(false);
  });

  it("returns NaN rather than guessing on junk", () => {
    expect(Number.isNaN(parseTime("not a date"))).toBe(true);
    expect(Number.isNaN(parseTime(""))).toBe(true);
  });
});

describe("band mapping", () => {
  it("maps priority text", () => {
    expect(bandFromPriority("STAT")).toBe("critical");
    expect(bandFromPriority("Routine")).toBe("routine");
    expect(bandFromPriority("something else")).toBe("medium");
    expect(bandFromPriority("")).toBeNull();
  });

  it("maps findings, treating normals as routine", () => {
    expect(bandFromFinding("No Finding")).toBe("routine");
    expect(bandFromFinding("Large right pneumothorax")).toBe("critical");
    expect(bandFromFinding("Small left pleural effusion")).toBe("medium");
  });
});

describe("parseWorklistCsv — header aliasing", () => {
  it("matches vendor-ish column names", () => {
    const csv = [
      "Accession Number,Exam Time,Report Signed,Order Priority,Modality",
      "A1,2026-03-04T10:00:00Z,2026-03-04T10:20:00Z,STAT,CXR",
    ].join("\n");
    const r = parseWorklistCsv(csv, { scoreFor: score });
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].band).toBe("critical");
    expect(r.bandSource).toBe("derived-from-priority");
  });

  it("prefers finding over priority for band assignment", () => {
    const csv = [
      "study_id,arrived_at,read_at,priority,finding",
      "A1,2026-03-04T10:00:00Z,2026-03-04T10:20:00Z,routine,Small left pleural effusion",
    ].join("\n");
    const r = parseWorklistCsv(csv, { scoreFor: score });
    expect(r.bandSource).toBe("derived-from-finding");
    expect(r.rows[0].band).toBe("medium");
  });

  it("honours an explicit band column above everything", () => {
    const csv = [
      "study_id,arrived_at,read_at,band,finding",
      "A1,2026-03-04T10:00:00Z,2026-03-04T10:20:00Z,critical,No Finding",
    ].join("\n");
    const r = parseWorklistCsv(csv, { scoreFor: score });
    expect(r.bandSource).toBe("explicit");
    expect(r.rows[0].band).toBe("critical");
  });

  it("reports a missing required column instead of half-parsing", () => {
    const csv = ["study_id,arrived_at", "A1,2026-03-04T10:00:00Z"].join("\n");
    const r = parseWorklistCsv(csv, { scoreFor: score });
    expect(r.rows).toHaveLength(0);
    expect(r.issues[0].reason).toMatch(/readAt/);
  });

  it("refuses to proceed with no way to assign bands", () => {
    const csv = [
      "study_id,arrived_at,read_at,modality",
      "A1,2026-03-04T10:00:00Z,2026-03-04T10:20:00Z,CXR",
    ].join("\n");
    const r = parseWorklistCsv(csv, { scoreFor: score });
    expect(r.bandSource).toBe("none");
    expect(r.rows).toHaveLength(0);
  });
});

describe("parseWorklistCsv — nothing vanishes quietly", () => {
  const base = "study_id,arrived_at,read_at,priority";

  it("reports and excludes unparseable timestamps", () => {
    const csv = [base, "A1,garbage,2026-03-04T10:20:00Z,STAT"].join("\n");
    const r = parseWorklistCsv(csv, { scoreFor: score });
    expect(r.rows).toHaveLength(0);
    expect(r.issues).toHaveLength(1);
    expect(r.issues[0].reason).toMatch(/arrival/);
  });

  it("reports and excludes unread studies rather than inventing a read time", () => {
    const csv = [base, "A1,2026-03-04T10:00:00Z,,STAT"].join("\n");
    const r = parseWorklistCsv(csv, { scoreFor: score });
    expect(r.rows).toHaveLength(0);
    expect(r.issues[0].reason).toMatch(/no read time/);
  });

  it("reports and excludes read-before-arrival rows", () => {
    const csv = [base, "A1,2026-03-04T11:00:00Z,2026-03-04T10:00:00Z,STAT"].join("\n");
    const r = parseWorklistCsv(csv, { scoreFor: score });
    expect(r.rows).toHaveLength(0);
    expect(r.issues[0].reason).toMatch(/before arrival/);
  });

  it("reports duplicate study ids", () => {
    const csv = [
      base,
      "A1,2026-03-04T10:00:00Z,2026-03-04T10:20:00Z,STAT",
      "A1,2026-03-04T11:00:00Z,2026-03-04T11:20:00Z,STAT",
    ].join("\n");
    const r = parseWorklistCsv(csv, { scoreFor: score });
    expect(r.rows).toHaveLength(1);
    expect(r.issues[0].reason).toMatch(/duplicate/);
  });

  it("excludes rows with no score rather than defaulting one", () => {
    // A silent default would let unscored studies sort to an arbitrary position.
    const csv = [base, "A1,2026-03-04T10:00:00Z,2026-03-04T10:20:00Z,STAT"].join("\n");
    const r = parseWorklistCsv(csv, { scoreFor: () => undefined });
    expect(r.rows).toHaveLength(0);
    expect(r.issues[0].reason).toMatch(/no Kroix score/);
  });

  it("accounts for every data line as either a row or an issue", () => {
    const csv = [
      base,
      "A1,2026-03-04T10:00:00Z,2026-03-04T10:20:00Z,STAT",
      "A2,bad,2026-03-04T10:20:00Z,routine",
      "A3,2026-03-04T10:00:00Z,,routine",
      "A4,2026-03-04T10:00:00Z,2026-03-04T12:00:00Z,routine",
    ].join("\n");
    const r = parseWorklistCsv(csv, { scoreFor: score });
    expect(r.rows.length + r.issues.length).toBe(4);
  });
});

describe("parseWorklistCsv — expedite column", () => {
  it("picks up a callback column and flags its presence", () => {
    const csv = [
      "study_id,arrived_at,read_at,priority,callback_at",
      "A1,2026-03-04T10:00:00Z,2026-03-04T12:00:00Z,routine,2026-03-04T11:00:00Z",
    ].join("\n");
    const r = parseWorklistCsv(csv, { scoreFor: score });
    expect(r.hasExpedite).toBe(true);
    expect(r.rows[0].expeditedAt).toBe(Date.parse("2026-03-04T11:00:00Z"));
  });

  it("reports absence so the export can be re-requested", () => {
    const csv = [
      "study_id,arrived_at,read_at,priority",
      "A1,2026-03-04T10:00:00Z,2026-03-04T10:20:00Z,routine",
    ].join("\n");
    expect(parseWorklistCsv(csv, { scoreFor: score }).hasExpedite).toBe(false);
  });

  it("keeps the row when only the expedite timestamp is junk", () => {
    const csv = [
      "study_id,arrived_at,read_at,priority,callback_at",
      "A1,2026-03-04T10:00:00Z,2026-03-04T10:20:00Z,routine,not-a-date",
    ].join("\n");
    const r = parseWorklistCsv(csv, { scoreFor: score });
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].expeditedAt).toBeUndefined();
  });
});
