/**
 * Worklist CSV -> WorklistRow[].
 *
 * Real RIS exports are messy: column names vary by vendor, timestamps come in
 * several formats, and priority strings are free text. This parser aliases
 * aggressively on the header but is strict about the data — a row it cannot
 * understand is REPORTED, never guessed at and never silently dropped.
 *
 * That asymmetry is deliberate. Silently discarding 30% of a department's rows
 * would change the breach counts and nobody would know.
 */

import type { Band, WorklistRow } from "./slaReplay";

export interface ParseIssue {
  line: number;
  reason: string;
}

export interface ParseResult {
  rows: WorklistRow[];
  issues: ParseIssue[];
  /** How `band` was determined, so the writeup can state it. */
  bandSource: "explicit" | "derived-from-priority" | "derived-from-finding" | "none";
  /** Header names we matched, for the report. */
  columns: Record<string, string>;
  /** True when the export carried an expedite/callback column. */
  hasExpedite: boolean;
}

/** Header aliases, lowercased and stripped of non-alphanumerics before matching. */
const ALIASES: Record<string, string[]> = {
  studyId: ["studyid", "accession", "accessionnumber", "studyuid", "id", "examid", "hash"],
  arrivedAt: ["arrivedat", "arrived", "arrivaltime", "studytime", "exampletime", "examtime", "acquired", "receivedat", "scheduled", "ordertime"],
  readAt: ["readat", "read", "readtime", "signedat", "signed", "reportsigned", "finalized", "dictatedat", "completedat", "verifiedat"],
  priority: ["priority", "urgency", "stat", "priorityflag", "orderpriority", "acuity"],
  modality: ["modality", "exammodality", "type", "examtype"],
  finding: ["finding", "findings", "diagnosis", "impression", "label", "groundtruth"],
  band: ["band", "severity", "severityband"],
  expeditedAt: ["expeditedat", "expedite", "callback", "callbackat", "statupgrade", "upgradedat", "wetread", "wetreadat", "chasecall", "escalatedat"],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function mapHeaders(header: string[]): Record<string, string> {
  const found: Record<string, string> = {};
  header.forEach((raw) => {
    const n = norm(raw);
    for (const [field, aliases] of Object.entries(ALIASES)) {
      if (found[field]) continue;
      if (aliases.includes(n)) found[field] = raw;
    }
  });
  return found;
}

/** Minimal RFC4180-ish splitter: handles quoted fields containing commas. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** Parse a timestamp. Returns NaN on anything unrecognised rather than guessing. */
export function parseTime(raw: string): number {
  const s = raw.trim();
  if (!s) return NaN;
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return t;
  // "2026-03-04 14:22:01" without a T — common in SQL exports
  const sql = s.replace(" ", "T");
  const t2 = Date.parse(sql);
  return Number.isNaN(t2) ? NaN : t2;
}

const CRITICAL_WORDS = /stat|emerg|critical|urgent1|priority1|\bp1\b/i;
const ROUTINE_WORDS = /routine|elective|normal|screening|standard/i;

/** Map a free-text priority string onto a band. */
export function bandFromPriority(raw: string): Band | null {
  const s = raw.trim();
  if (!s) return null;
  if (CRITICAL_WORDS.test(s)) return "critical";
  if (ROUTINE_WORDS.test(s)) return "routine";
  return "medium";
}

const CRITICAL_FINDINGS = /pneumothorax|tension|massive|extensive|edema|hemorrhage|dissection|embol/i;
const NORMAL_FINDINGS = /no finding|normal|unremarkable|clear|negative/i;

/** Map a finding label onto a band. Prefer this over priority when available. */
export function bandFromFinding(raw: string): Band | null {
  const s = raw.trim();
  if (!s) return null;
  if (NORMAL_FINDINGS.test(s)) return "routine";
  if (CRITICAL_FINDINGS.test(s)) return "critical";
  return "medium";
}

export interface ParseOptions {
  /**
   * Score for each row. The replay needs Kroix's priority score; a CSV from a
   * department will not contain one. Rows with no score are reported as issues
   * rather than defaulted — a silent default would let unscored studies sort to
   * an arbitrary queue position and quietly change the result.
   *
   * See `parseScoresCsv` and SCORE_MODES for how scores are meant to arrive.
   */
  scoreFor?: (row: { studyId: string; finding?: string; band: Band }) => number | undefined;
}

/**
 * How the scores in a given run were obtained. This must travel with every
 * number the replay produces, because only one of these three says anything
 * about the model.
 */
export type ScoreMode = "real" | "proxy" | "stub";

export const SCORE_MODES: Record<ScoreMode, { label: string; reportable: boolean; note: string }> = {
  real: {
    label: "real inference",
    reportable: true,
    note: "Scores came from running the ensemble over the actual studies. This measures Kroix.",
  },
  proxy: {
    label: "label-derived proxy",
    reportable: false,
    note:
      "Scores were derived from the report's finding text, not from the model. This measures how well a finding label predicts read urgency — it says NOTHING about Kroix. Useful only to show the department the replay mechanics on their own data before any images move.",
  },
  stub: {
    label: "band constants",
    reportable: false,
    note:
      "Scores are fixed per band. Plumbing test only. Any figure from this run describes the band labels and must not be shown to anyone.",
  },
};

/**
 * Parse a scores sidecar: `study_id,score` (header optional).
 *
 * This is the file a department produces by running inference **inside their own
 * network**, so no image ever leaves. It joins to the worklist on study id. Scores
 * outside [0,1] or unparseable are reported rather than clamped, since a clamped
 * score silently becomes a real queue position.
 */
export function parseScoresCsv(text: string): {
  scores: Map<string, number>;
  issues: ParseIssue[];
} {
  const scores = new Map<string, number>();
  const issues: ParseIssue[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  lines.forEach((raw, i) => {
    const f = splitCsvLine(raw);
    if (f.length < 2) {
      issues.push({ line: i + 1, reason: "expected two columns: study_id,score" });
      return;
    }
    const [id, scoreRaw] = f;
    // Tolerate a header row, but only when the first cell actually looks like a
    // header name. Checking "is the score non-numeric" alone would swallow a real
    // first data row whose score is malformed — exactly the row we must report.
    if (
      i === 0 &&
      Number.isNaN(Number(scoreRaw)) &&
      ALIASES.studyId.includes(norm(id))
    ) {
      return;
    }

    const v = Number(scoreRaw);
    if (!Number.isFinite(v)) {
      issues.push({ line: i + 1, reason: `unparseable score "${scoreRaw}" for ${id}` });
      return;
    }
    if (v < 0 || v > 1) {
      issues.push({ line: i + 1, reason: `score ${v} outside [0,1] for ${id}` });
      return;
    }
    if (scores.has(id)) {
      issues.push({ line: i + 1, reason: `duplicate score for ${id}` });
      return;
    }
    scores.set(id, v);
  });

  return { scores, issues };
}

/**
 * Label-derived proxy score. NOT the model.
 *
 * Ranks a finding by how urgently a radiologist would plausibly want it read,
 * from the report text alone. Its only legitimate use is demonstrating the replay
 * mechanics on a department's own data before any image has moved — it measures
 * how well a finding label predicts read urgency, which is a property of the
 * labels, not of Kroix.
 *
 * Kept in a named export rather than inlined so it can never be mistaken for
 * inference at a call site.
 */
export function proxyScoreFromFinding(finding: string | undefined, band: Band): number {
  const s = (finding ?? "").toLowerCase();
  if (/tension|massive|extensive/.test(s)) return 0.97;
  if (/pneumothorax|hemorrhage|dissection|embol/.test(s)) return 0.92;
  if (/edema|consolidation.*bilateral/.test(s)) return 0.88;
  if (/consolidation|infiltrate|pneumonia/.test(s)) return 0.62;
  if (/effusion/.test(s)) return 0.58;
  if (/atelectasis|congestion/.test(s)) return 0.45;
  if (/nodule|mass/.test(s)) return 0.38;
  if (/cardiomegaly|interstitial|thickening/.test(s)) return 0.3;
  if (/no finding|normal|unremarkable|clear|negative/.test(s)) return 0.08;
  // Unrecognised text: fall back to the band midpoint rather than inventing detail.
  return { critical: 0.9, medium: 0.5, routine: 0.12 }[band];
}

export function parseWorklistCsv(text: string, opts: ParseOptions = {}): ParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const issues: ParseIssue[] = [];

  if (lines.length < 2) {
    return {
      rows: [],
      issues: [{ line: 0, reason: "file has no data rows" }],
      bandSource: "none",
      columns: {},
      hasExpedite: false,
    };
  }

  const header = splitCsvLine(lines[0]);
  const cols = mapHeaders(header);

  for (const required of ["studyId", "arrivedAt", "readAt"] as const) {
    if (!cols[required]) {
      issues.push({
        line: 1,
        reason: `no column matched "${required}". Header was: ${header.join(", ")}`,
      });
    }
  }
  if (issues.length > 0) {
    return { rows: [], issues, bandSource: "none", columns: cols, hasExpedite: false };
  }

  const idx = (field: string) => header.indexOf(cols[field]);
  const iId = idx("studyId");
  const iArr = idx("arrivedAt");
  const iRead = idx("readAt");
  const iPrio = cols.priority ? idx("priority") : -1;
  const iFind = cols.finding ? idx("finding") : -1;
  const iBand = cols.band ? idx("band") : -1;
  const iExp = cols.expeditedAt ? idx("expeditedAt") : -1;

  const bandSource: ParseResult["bandSource"] = iBand >= 0
    ? "explicit"
    : iFind >= 0
      ? "derived-from-finding"
      : iPrio >= 0
        ? "derived-from-priority"
        : "none";

  if (bandSource === "none") {
    issues.push({
      line: 1,
      reason: "no band, finding, or priority column — cannot assign severity bands",
    });
    return { rows: [], issues, bandSource, columns: cols, hasExpedite: iExp >= 0 };
  }

  const rows: WorklistRow[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const lineNo = i + 1;
    const f = splitCsvLine(lines[i]);

    const studyId = f[iId] ?? "";
    if (!studyId) {
      issues.push({ line: lineNo, reason: "empty study id" });
      continue;
    }
    if (seen.has(studyId)) {
      issues.push({ line: lineNo, reason: `duplicate study id ${studyId}` });
      continue;
    }

    const arrivedAt = parseTime(f[iArr] ?? "");
    const readAt = parseTime(f[iRead] ?? "");
    if (Number.isNaN(arrivedAt)) {
      issues.push({ line: lineNo, reason: `unparseable arrival time "${f[iArr]}"` });
      continue;
    }
    if (Number.isNaN(readAt)) {
      // Unread studies are legitimate but cannot participate: there is no slot.
      issues.push({ line: lineNo, reason: "no read time (still unread?) — excluded" });
      continue;
    }
    if (readAt < arrivedAt) {
      issues.push({ line: lineNo, reason: "read before arrival — bad data, excluded" });
      continue;
    }

    let band: Band | null = null;
    if (iBand >= 0) {
      const b = (f[iBand] ?? "").trim().toLowerCase();
      band = b === "critical" || b === "medium" || b === "routine" ? (b as Band) : null;
      if (!band) issues.push({ line: lineNo, reason: `unrecognised band "${f[iBand]}"` });
    } else if (iFind >= 0) {
      band = bandFromFinding(f[iFind] ?? "");
    } else {
      band = bandFromPriority(f[iPrio] ?? "");
    }
    if (!band) {
      issues.push({ line: lineNo, reason: "could not assign a band — excluded" });
      continue;
    }

    const score = opts.scoreFor?.({
      studyId,
      finding: iFind >= 0 ? f[iFind] : undefined,
      band,
    });
    if (score === undefined || Number.isNaN(score)) {
      issues.push({ line: lineNo, reason: "no Kroix score available — excluded" });
      continue;
    }

    const row: WorklistRow = { studyId, arrivedAt, readAt, band, score };

    if (iExp >= 0) {
      const e = parseTime(f[iExp] ?? "");
      if (!Number.isNaN(e)) row.expeditedAt = e;
    }

    rows.push(row);
    seen.add(studyId);
  }

  return { rows, issues, bandSource, columns: cols, hasExpedite: iExp >= 0 };
}
