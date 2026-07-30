#!/usr/bin/env bun
/**
 * MIMIC-IV-Note radiology.csv -> worklist.csv for /sla-replay.
 *
 *   bun run scripts/mimicToWorklist.ts radiology.csv [radiology_detail.csv] > worklist.csv
 *
 * Then:
 *   npm run replay -- worklist.csv --proxy --stat 30 --medium 240
 *
 * MIMIC is credentialed data. Keep the input and output on your machine; neither
 * belongs in this repo (both *.csv paths used here are gitignored by convention —
 * check before you save anything into the project directory).
 */

import { readFileSync } from "fs";
import { splitCsvLine } from "../src/validation/parseWorklist";
import { adaptMimicRows, toWorklistCsv, type MimicRadiologyRow } from "../src/validation/mimicAdapter";

const [radiologyPath, detailPath] = process.argv.slice(2).filter((a) => !a.startsWith("--"));

if (!radiologyPath) {
  console.error(
    [
      "usage: bun run scripts/mimicToWorklist.ts <radiology.csv> [radiology_detail.csv] > worklist.csv",
      "",
      "  radiology.csv         mimiciv_note.radiology export",
      "                        (note_id, subject_id, hadm_id, note_type, note_seq,",
      "                         charttime, storetime, text)",
      "  radiology_detail.csv  optional. Supplies exam names, which makes the",
      "                        chest-radiograph filter far more reliable than",
      "                        guessing from report text.",
    ].join("\n")
  );
  process.exit(1);
}

/** Parse a CSV whose final column is free text that may contain commas and newlines. */
function parseRadiologyCsv(text: string): MimicRadiologyRow[] {
  const lines = text.split(/\r?\n/);
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const col = (n: string) => header.indexOf(n);

  const iId = col("note_id");
  const iSub = col("subject_id");
  const iChart = col("charttime");
  const iStore = col("storetime");
  const iText = col("text");

  if (iId < 0 || iChart < 0 || iText < 0) {
    console.error(`error: radiology.csv missing required columns. Header: ${header.join(", ")}`);
    process.exit(1);
  }

  const rows: MimicRadiologyRow[] = [];
  // Report text spans multiple physical lines, so accumulate until the row has
  // enough fields. Splitting naively on newlines would shred every report.
  let buf = "";
  for (let i = 1; i < lines.length; i++) {
    buf = buf ? `${buf}\n${lines[i]}` : lines[i];
    if (!buf.trim()) {
      buf = "";
      continue;
    }
    const quotes = (buf.match(/"/g) ?? []).length;
    if (quotes % 2 !== 0) continue; // inside an unterminated quoted field

    const f = splitCsvLine(buf.replace(/\n/g, " "));
    buf = "";
    if (f.length <= Math.max(iId, iChart, iText)) continue;

    rows.push({
      note_id: f[iId],
      subject_id: iSub >= 0 ? f[iSub] : "",
      charttime: f[iChart],
      storetime: iStore >= 0 ? f[iStore] : undefined,
      text: f[iText],
    });
  }
  return rows;
}

/** exam name per note_id, from radiology_detail's long-format field_name/field_value. */
function parseExamNames(text: string): Map<string, string> {
  const out = new Map<string, string>();
  const lines = text.split(/\r?\n/);
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const iId = header.indexOf("note_id");
  const iName = header.indexOf("field_name");
  const iVal = header.indexOf("field_value");
  if (iId < 0 || iName < 0 || iVal < 0) return out;

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const f = splitCsvLine(lines[i]);
    if (f.length <= Math.max(iId, iName, iVal)) continue;
    if (/exam.?name|exam.?code/i.test(f[iName])) out.set(f[iId], f[iVal]);
  }
  return out;
}

const radiology = parseRadiologyCsv(readFileSync(radiologyPath, "utf8"));
const examNames = detailPath ? parseExamNames(readFileSync(detailPath, "utf8")) : new Map<string, string>();

const { rows, skipped } = adaptMimicRows(radiology, examNames);

// Report to stderr so stdout stays a clean CSV that can be piped.
const err = (s: string) => console.error(s);
err("");
err("MIMIC -> WORKLIST");
err("=".repeat(56));
err(`  radiology rows read ... ${radiology.length}`);
err(`  exam names loaded ..... ${examNames.size}${detailPath ? "" : "   (no detail file — filtering from report text only)"}`);
err(`  adapted ............... ${rows.length}`);
err(`  skipped ............... ${skipped.length}`);

const byReason = new Map<string, number>();
for (const s of skipped) byReason.set(s.reason, (byReason.get(s.reason) ?? 0) + 1);
if (byReason.size) {
  err("");
  err("  SKIP REASONS");
  for (const [reason, n] of [...byReason.entries()].sort((a, b) => b[1] - a[1])) {
    err(`    ${String(n).padStart(6)}  ${reason}`);
  }
}

const bands = new Map<string, number>();
for (const r of rows) bands.set(r.band, (bands.get(r.band) ?? 0) + 1);
if (rows.length) {
  err("");
  err("  BANDS");
  for (const b of ["critical", "medium", "routine"]) {
    err(`    ${b.padEnd(9)} ${bands.get(b) ?? 0}`);
  }
  const waits = rows.map((r) => Date.parse(r.readAt) - Date.parse(r.arrivedAt)).sort((a, b) => a - b);
  const h = (ms: number) => (ms / 3_600_000).toFixed(1) + "h";
  err("");
  err("  READ LATENCY (storetime - charttime, real intervals)");
  err(`    median .............. ${h(waits[Math.floor(waits.length / 2)])}`);
  err(`    p90 ................. ${h(waits[Math.floor(waits.length * 0.9)])}`);
  err(`    max ................. ${h(waits[waits.length - 1])}`);
}

err("");
err("  CAVEATS to carry into any writeup");
err("    charttime approximates arrival; it is the note's chart time, not");
err("    scanner acquisition. storetime approximates read completion; it is a");
err("    database write. Dates are shifted for de-identification, so only");
err("    intervals are meaningful. Single academic centre.");
err("");

process.stdout.write(toWorklistCsv(rows));
