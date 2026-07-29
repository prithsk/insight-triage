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
   * department will not contain one. Supply it by running inference, or pass a
   * stub to test the pipeline. Rows with no score are reported as issues.
   */
  scoreFor?: (row: { studyId: string; finding?: string; band: Band }) => number | undefined;
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
