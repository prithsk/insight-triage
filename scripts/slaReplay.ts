#!/usr/bin/env bun
/**
 * SLA replay CLI.
 *
 *   bun run scripts/slaReplay.ts <worklist.csv> [--stat 30] [--medium 240] [--routine 1440]
 *
 * Reads a department's worklist export, replays Kroix's ordering against it while
 * holding throughput fixed, and reports avoided read-time breaches plus avoided
 * expedite calls.
 *
 * Run this LOCALLY on the department's file. Do not upload a worklist anywhere.
 *
 * NOTE ON SCORES. A department's export has no Kroix score in it. Until inference
 * is wired in, this uses a band-derived stand-in so the pipeline is runnable and
 * the plumbing is verifiable — and it says so loudly in the output. Numbers
 * produced that way describe the band labels, NOT the model, and must never be
 * shown to anyone.
 */

import { readFileSync } from "fs";
import {
  parseWorklistCsv,
  parseScoresCsv,
  proxyScoreFromFinding,
  SCORE_MODES,
  type ScoreMode,
} from "../src/validation/parseWorklist";
import {
  analyse,
  expediteAnalysis,
  queueDepths,
  segmentByDepth,
  verdictFor,
  VERDICT_COPY,
  byArrival,
  MINUTES,
  type Targets,
  type Band,
} from "../src/validation/slaReplay";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));

if (!file) {
  console.error(
    [
      "usage: npm run replay -- <worklist.csv> [options]",
      "",
      "  --scores <file>   study_id,score CSV from real inference. THE ONLY REPORTABLE MODE.",
      "                    The department runs inference inside their own network and sends",
      "                    back scores only; no image ever leaves.",
      "  --proxy           derive scores from the finding text. Demonstrates the mechanics",
      "                    on their data before any images move. Not reportable.",
      "  (neither)         band constants. Plumbing test only. Not reportable.",
      "",
      "  --stat <min>      critical read-time target (default 30)",
      "  --medium <min>    medium target (default 240)",
      "  --routine <min>   routine target (default 1440)",
    ].join("\n")
  );
  process.exit(1);
}

function flag(name: string, fallback: number): number {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = Number(args[i + 1]);
  return Number.isFinite(v) ? v : fallback;
}

const statMin = flag("stat", 30);
const medMin = flag("medium", 240);
const rtnMin = flag("routine", 1440);
const usedDefaults = !args.includes("--stat") && !args.includes("--medium") && !args.includes("--routine");

const targets: Targets = {
  critical: statMin * MINUTES,
  medium: medMin * MINUTES,
  routine: rtnMin * MINUTES,
};

/* ── Scores: three modes, only one of which measures the model ──────────── */

const scoresArgIdx = args.indexOf("--scores");
const scoresFile = scoresArgIdx === -1 ? undefined : args[scoresArgIdx + 1];
const useProxy = args.includes("--proxy");

const STUB_SCORE: Record<Band, number> = { critical: 0.9, medium: 0.55, routine: 0.15 };

let mode: ScoreMode;
let scoreFor: (r: { studyId: string; finding?: string; band: Band }) => number | undefined;
let scoreIssues: { line: number; reason: string }[] = [];
let scoreCount = 0;

if (scoresFile) {
  const parsedScores = parseScoresCsv(readFileSync(scoresFile, "utf8"));
  scoreIssues = parsedScores.issues;
  scoreCount = parsedScores.scores.size;
  mode = "real";
  // Missing score returns undefined, so the row is excluded and reported rather
  // than silently filled in.
  scoreFor = ({ studyId }) => parsedScores.scores.get(studyId);
} else if (useProxy) {
  mode = "proxy";
  scoreFor = ({ finding, band }) => proxyScoreFromFinding(finding, band);
} else {
  mode = "stub";
  scoreFor = ({ band }) => STUB_SCORE[band];
}

const modeInfo = SCORE_MODES[mode];

const text = readFileSync(file, "utf8");
const parsed = parseWorklistCsv(text, { scoreFor });

const line = (s = "") => console.log(s);
const fmtH = (ms: number) => `${(ms / (60 * MINUTES)).toFixed(1)}h`;

line();
line("SLA REPLAY");
line("=".repeat(64));
line(`  file .................. ${file}`);
line(`  rows parsed ........... ${parsed.rows.length}`);
line(`  rows excluded ......... ${parsed.issues.length}`);
line(`  band source ........... ${parsed.bandSource}`);
line(`  score mode ............ ${modeInfo.label}${modeInfo.reportable ? "" : "   [NOT REPORTABLE]"}`);
if (scoresFile) line(`  scores joined ......... ${scoreCount} from ${scoresFile}`);
if (scoreIssues.length) line(`  score file issues ..... ${scoreIssues.length}`);
line(`  expedite column ....... ${parsed.hasExpedite ? "present" : "ABSENT — ask for it"}`);
line(`  targets ............... STAT ${statMin}m / medium ${medMin}m / routine ${rtnMin}m${usedDefaults ? "  [ASSUMED — get their real SLA]" : ""}`);
line(`  throughput ............ held fixed`);

if (parsed.issues.length) {
  line();
  line("  EXCLUDED ROWS (first 15)");
  for (const iss of parsed.issues.slice(0, 15)) line(`    line ${iss.line}: ${iss.reason}`);
  if (parsed.issues.length > 15) line(`    ... and ${parsed.issues.length - 15} more`);
}

if (parsed.rows.length === 0) {
  line();
  line("  Nothing to replay. Fix the issues above and re-run.");
  process.exit(1);
}

const res = analyse(parsed.rows, targets);
const fifo = analyse(parsed.rows, targets, byArrival);
const depths = queueDepths(parsed.rows);
const { busy, quiet } = segmentByDepth(parsed.rows);

line();
line("  BREACHES — actual vs replayed");
for (const band of ["critical", "medium", "routine"] as Band[]) {
  const c = res.byBand[band];
  const tag = band === "medium" ? "  <- primary" : "";
  line(
    `    ${band.padEnd(9)} ${String(c.breachedActual).padStart(5)} -> ${String(c.breachedReplay).padStart(5)}` +
      `   avoided ${String(c.avoided).padStart(5)}   of ${c.total}${tag}`
  );
}
line(
  `    ${"OVERALL".padEnd(9)} ${String(res.overall.breachedActual).padStart(5)} -> ${String(res.overall.breachedReplay).padStart(5)}` +
    `   avoided ${String(res.overall.avoided).padStart(5)}`
);
line();
line(`  vs FIFO baseline ...... medium ${fifo.byBand.medium.breachedReplay} breaches (incumbent)`);

line();
line("  QUEUE DEPTH — value only exists where demand exceeds capacity");
line(`    max ................. ${Math.max(...depths)}`);
line(`    median .............. ${[...depths].sort((a, b) => a - b)[Math.floor(depths.length / 2)]}`);
line(`    busy-tercile rows ... ${busy.length}`);
line(`    quiet rows .......... ${quiet.length}`);
if (busy.length > 0) {
  // Reuse the full-worklist replay. Re-replaying a subset would rebuild a
  // different queue with different slots and report a meaningless number.
  const b = analyse(busy, targets, byArrival, res.replayReadAt).byBand.medium;
  const q = analyse(quiet, targets, byArrival, res.replayReadAt).byBand.medium;
  line(`    busy medium avoided . ${b.avoided} of ${b.breachedActual}`);
  line(`    quiet medium avoided  ${q.avoided} of ${q.breachedActual}`);
}

if (parsed.hasExpedite) {
  const exp = expediteAnalysis(parsed.rows, res.replayReadAt);
  line();
  line("  EXPEDITE CALLS — the radiologist-facing metric");
  line(`    expedited studies ... ${exp.mechanism.expedited}`);
  line(`    median wait, called . ${fmtH(exp.mechanism.medianWaitExpedited)}`);
  line(`    median wait, not .... ${fmtH(exp.mechanism.medianWaitNotExpedited)}`);
  line(`    ratio ............... ${exp.mechanism.ratio.toFixed(2)}`);
  if (exp.mechanism.ratio >= 1.5) {
    line(`    MECHANISM HOLDS ..... calls concentrate on long-waiting studies`);
    line(`    calls avoided ....... ${exp.avoided} of ${exp.avoided + exp.remaining}`);
  } else {
    line(`    MECHANISM REJECTED .. calls are not wait-driven here (ratio < 1.5).`);
    line(`                          Do NOT make the interruption argument for this site.`);
  }
}

const v = verdictFor(res.byBand.medium);
line();
line("  VERDICT: " + v.toUpperCase());
line("  " + VERDICT_COPY[v]);

line();
line("  LIMITS");
line("    Retrospective, single-centre, read timing only.");
line("    Not a clinical-benefit claim. Assumes full adherence to the ordering.");

if (!modeInfo.reportable) {
  line();
  line(`  !! NOT REPORTABLE — score mode is "${modeInfo.label}" !!`);
  for (const l of wrap(modeInfo.note, 72)) line("    " + l);
  line();
  line("    To get a reportable number, have the department run inference inside");
  line("    their own network and send back only study_id,score — no images leave.");
  line("    Then re-run with:  npm run replay -- <worklist.csv> --scores <scores.csv>");
} else {
  line();
  line("  Score mode is real inference — this result is reportable, with the limits above.");
}

if (scoreIssues.length) {
  line();
  line("  SCORE FILE ISSUES (first 10)");
  for (const iss of scoreIssues.slice(0, 10)) line(`    line ${iss.line}: ${iss.reason}`);
}
line();

function wrap(s: string, width: number): string[] {
  const words = s.split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > width) {
      out.push(cur.trim());
      cur = w;
    } else cur += " " + w;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
