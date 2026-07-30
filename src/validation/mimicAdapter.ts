/**
 * MIMIC-IV-Note -> worklist CSV adapter.
 *
 * Turns real hospital read-latency data into the shape `/sla-replay` consumes, so
 * the replay can produce a number before any department has said yes.
 *
 * WHY THIS WORKS. `mimiciv_note.radiology` carries:
 *
 *     charttime TIMESTAMP NOT NULL   -- when the note was charted
 *     storetime TIMESTAMP            -- when it was filed to the database
 *
 * `storetime - charttime` is a real interval from a real hospital, which is what
 * makes this evidence rather than simulation.
 *
 * WHERE IT IS APPROXIMATE, and this must be stated in any writeup:
 *
 *  - `charttime` approximates study arrival but is the NOTE's chart time, not the
 *    scanner's acquisition timestamp. For a same-session read the two are close;
 *    for a report dictated later they are not.
 *  - `storetime` approximates read completion but reflects database write, which
 *    can lag the radiologist finishing. It is also NULLABLE — those rows must be
 *    dropped, not guessed at.
 *  - MIMIC dates are shifted into three-year ranges for de-identification.
 *    Absolute dates are meaningless; INTERVALS within a study are preserved, and
 *    intervals are all the replay uses.
 *  - This is one academic centre (BIDMC). Queue dynamics elsewhere will differ —
 *    the published off-hours null result is proof of exactly that.
 *
 * So: real intervals, approximate endpoints, one site. Good enough to produce a
 * defensible first number. Not good enough to describe as validation.
 */

import type { Band } from "./slaReplay";

/** A row as it appears in mimiciv_note.radiology. */
export interface MimicRadiologyRow {
  note_id: string;
  subject_id: string;
  charttime: string;
  /** Nullable in the schema. Rows without it cannot participate. */
  storetime?: string;
  text: string;
}

export interface AdaptedRow {
  studyId: string;
  arrivedAt: string;
  readAt: string;
  band: Band;
  finding: string;
  modality: string;
}

export interface AdaptResult {
  rows: AdaptedRow[];
  skipped: { note_id: string; reason: string }[];
}

/**
 * Pull the IMPRESSION section, falling back to FINDINGS.
 *
 * MIMIC reports are free text with capitalised section headers. IMPRESSION is the
 * radiologist's conclusion and is the closest thing to a label; FINDINGS is more
 * verbose and less conclusive.
 */
export function extractImpression(text: string): string {
  const impression = /IMPRESSION[:\s]*([\s\S]*?)(?=\n[A-Z][A-Z ]{3,}:|$)/i.exec(text);
  if (impression?.[1]?.trim()) return normaliseWhitespace(impression[1]);

  const findings = /FINDINGS[:\s]*([\s\S]*?)(?=\n[A-Z][A-Z ]{3,}:|$)/i.exec(text);
  if (findings?.[1]?.trim()) return normaliseWhitespace(findings[1]);

  return "";
}

function normaliseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Is this a chest radiograph?
 *
 * Kroix only scores CXR, so anything else has to go — leaving CT and MRI in would
 * mix modalities with completely different read-time expectations and make the
 * breach counts meaningless.
 */
export function isChestRadiograph(text: string, examName?: string): boolean {
  // Punctuation is flattened first. MIMIC writes exam names like
  // "CHEST (PA AND LAT)" and "CHEST (PORTABLE AP)", so any pattern expecting
  // bare words would miss every one of them.
  const hay = `${examName ?? ""} ${text.slice(0, 400)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const isCxr =
    /\bchest\b[a-z0-9 ]{0,20}\b(x ray|xray|radiograph|pa and lat|pa lat|portable|ap|frontal|single view|upright)\b/.test(hay) ||
    /\bcxr\b/.test(hay) ||
    /\b(pa and lat|portable ap)\b[a-z0-9 ]{0,20}\bchest\b/.test(hay);

  const otherModality =
    /\b(ct|cta|computed tomog|mri|mr|magnetic reson|ultrasound|sonograph|mammogram|fluoroscop|pet|nuclear)\b/.test(hay);

  // An explicit other-modality mention disqualifies unless the study is also
  // clearly named as a chest radiograph (e.g. a CXR report referencing a prior CT).
  if (otherModality && !isCxr) return false;
  return isCxr;
}

/**
 * Urgency band from report text.
 *
 * Deliberately conservative: anything not recognisably emergent or recognisably
 * normal lands in `medium`, which is the band under study. Over-assigning to
 * medium is the safe error — it dilutes the effect rather than inflating it.
 */
export function bandFromReport(impression: string): Band {
  const s = impression.toLowerCase();

  if (
    /tension pneumothorax|large pneumothorax|massive|extensive consolidation|acute respiratory distress/.test(s)
  ) {
    return "critical";
  }
  if (/pneumothorax|pulmonary edema|hemorrhage|malposition|misplaced|tube.*(?:advanced|withdrawn)/.test(s)) {
    return "critical";
  }
  if (
    /no acute|no evidence of acute|unremarkable|normal chest|clear lungs|no focal consolidation|without acute/.test(s)
  ) {
    return "routine";
  }
  return "medium";
}

export function adaptMimicRows(
  rows: MimicRadiologyRow[],
  examNames: Map<string, string> = new Map()
): AdaptResult {
  const out: AdaptedRow[] = [];
  const skipped: { note_id: string; reason: string }[] = [];

  for (const r of rows) {
    if (!r.storetime || !r.storetime.trim()) {
      skipped.push({ note_id: r.note_id, reason: "null storetime — no read time available" });
      continue;
    }

    const arrived = Date.parse(r.charttime.replace(" ", "T"));
    const read = Date.parse(r.storetime.replace(" ", "T"));
    if (Number.isNaN(arrived) || Number.isNaN(read)) {
      skipped.push({ note_id: r.note_id, reason: "unparseable charttime/storetime" });
      continue;
    }
    if (read < arrived) {
      skipped.push({ note_id: r.note_id, reason: "storetime before charttime — excluded" });
      continue;
    }

    const examName = examNames.get(r.note_id);
    if (!isChestRadiograph(r.text, examName)) {
      skipped.push({ note_id: r.note_id, reason: "not a chest radiograph" });
      continue;
    }

    const impression = extractImpression(r.text);
    if (!impression) {
      skipped.push({ note_id: r.note_id, reason: "no IMPRESSION or FINDINGS section" });
      continue;
    }

    out.push({
      studyId: r.note_id,
      arrivedAt: new Date(arrived).toISOString(),
      readAt: new Date(read).toISOString(),
      band: bandFromReport(impression),
      // Quotes stripped so the emitted CSV cannot be broken by report text.
      finding: impression.slice(0, 200).replace(/"/g, ""),
      modality: "CXR",
    });
  }

  return { rows: out, skipped };
}

/**
 * Emit the worklist CSV that `/sla-replay` reads.
 *
 * Sanitising happens HERE rather than only in the adapter, so a caller that builds
 * rows by hand cannot emit a file whose quotes or newlines break the parser and
 * silently shift every subsequent column.
 */
export function toWorklistCsv(rows: AdaptedRow[]): string {
  const clean = (s: string) => s.replace(/["\r\n]+/g, " ").trim();
  const header = "study_id,arrived_at,read_at,band,finding,modality";
  const body = rows.map(
    (r) =>
      `${clean(r.studyId)},${r.arrivedAt},${r.readAt},${r.band},"${clean(r.finding)}",${clean(r.modality)}`
  );
  return [header, ...body].join("\n") + "\n";
}
