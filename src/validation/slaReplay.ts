/**
 * SLA replay engine.
 *
 * Answers the commercial question — "would this have helped?" — against a
 * department's own history, without deployment, clearance, or a prospective study.
 *
 * The design constraint that makes the result defensible: **throughput is held
 * fixed**. We do not assume the department reads more studies or reads them faster.
 * The same number of reads complete at the same wall-clock times; only the
 * assignment of which waiting study fills each slot changes. Any model that relaxes
 * this is claiming Kroix makes radiologists faster, which it does not.
 *
 * We report read timing only. This says nothing about whether earlier reads changed
 * patient care — that inference is exactly the attribution problem this design
 * exists to sidestep.
 */

export type Band = "critical" | "medium" | "routine";

export interface WorklistRow {
  studyId: string;
  /** epoch ms the study landed in the worklist */
  arrivedAt: number;
  /** epoch ms it was actually read */
  readAt: number;
  /** severity band, from ground truth or final report */
  band: Band;
  /** Kroix priority score in [0,1]. Higher = read sooner. */
  score: number;
  /**
   * epoch ms of the FIRST expedite request on this study — a callback, STAT
   * upgrade, wet-read request, or chase call. Optional: many RIS exports carry
   * it, some do not.
   *
   * This is the closest thing to a radiologist-facing incentive that is also
   * countable. An expedite request is an interruption, and interruptions are a
   * published error-rate multiplier (Balint et al., Academic Radiology 2014:
   * one additional call in the preceding hour associated with a 12% increase in
   * the likelihood of a discrepant report).
   */
  expeditedAt?: number;
}

/** Read-time target per band, in milliseconds. */
export type Targets = Record<Band, number>;

export const MINUTES = 60_000;
export const HOURS = 60 * MINUTES;

/** Common defaults. Override with the department's real SLA whenever it exists. */
export const DEFAULT_TARGETS: Targets = {
  critical: 30 * MINUTES,
  medium: 4 * HOURS,
  routine: 24 * HOURS,
};

export interface ReplayCounts {
  total: number;
  breachedActual: number;
  breachedReplay: number;
  /** breachedActual - breachedReplay. Negative means the replay is WORSE. */
  avoided: number;
}

export interface ReplayResult {
  byBand: Record<Band, ReplayCounts>;
  overall: ReplayCounts;
  /** Per-study replayed read time, keyed by studyId. */
  replayReadAt: Map<string, number>;
}

/**
 * Order the waiting set. Higher score first; ties broken by earlier arrival so the
 * comparison against FIFO stays fair (a tie should not silently become LIFO).
 */
type Ranker = (a: WorklistRow, b: WorklistRow) => number;

export const byScore: Ranker = (a, b) =>
  b.score - a.score || a.arrivedAt - b.arrivedAt;

export const byArrival: Ranker = (a, b) => a.arrivedAt - b.arrivedAt;

/**
 * Replay a worklist under a given ordering policy, holding throughput fixed.
 *
 * The read *slots* are the actual completion times from history. At each slot we
 * pick from the studies that had arrived by then and were not yet read, using the
 * supplied ranker. A slot with nothing waiting is skipped — that is a genuinely
 * idle moment and inventing work for it would inflate the result.
 */
export function replay(rows: WorklistRow[], rank: Ranker): Map<string, number> {
  const slots = rows.map((r) => r.readAt).sort((a, b) => a - b);
  const pending = [...rows].sort((a, b) => a.arrivedAt - b.arrivedAt);

  const assigned = new Map<string, number>();
  const waiting: WorklistRow[] = [];
  let next = 0;

  for (const slot of slots) {
    // Everything that had arrived by this slot joins the waiting set.
    while (next < pending.length && pending[next].arrivedAt <= slot) {
      waiting.push(pending[next]);
      next++;
    }
    if (waiting.length === 0) continue; // idle slot — nothing to reorder

    waiting.sort(rank);
    const pick = waiting.shift()!;
    assigned.set(pick.studyId, slot);
  }

  // Any study never assigned a slot (possible only if arrivals trail the last
  // completion) keeps its original time so it is neither rewarded nor punished.
  for (const r of rows) {
    if (!assigned.has(r.studyId)) assigned.set(r.studyId, r.readAt);
  }

  return assigned;
}

function emptyCounts(): ReplayCounts {
  return { total: 0, breachedActual: 0, breachedReplay: 0, avoided: 0 };
}

/** Did this study miss its target? */
export function breached(row: WorklistRow, readAt: number, targets: Targets): boolean {
  return readAt - row.arrivedAt > targets[row.band];
}

export function analyse(
  rows: WorklistRow[],
  targets: Targets = DEFAULT_TARGETS,
  rank: Ranker = byScore
): ReplayResult {
  const replayReadAt = replay(rows, rank);

  const byBand: Record<Band, ReplayCounts> = {
    critical: emptyCounts(),
    medium: emptyCounts(),
    routine: emptyCounts(),
  };
  const overall = emptyCounts();

  for (const r of rows) {
    const rep = replayReadAt.get(r.studyId)!;
    const a = breached(r, r.readAt, targets);
    const b = breached(r, rep, targets);

    for (const bucket of [byBand[r.band], overall]) {
      bucket.total++;
      if (a) bucket.breachedActual++;
      if (b) bucket.breachedReplay++;
    }
  }

  for (const bucket of [...Object.values(byBand), overall]) {
    bucket.avoided = bucket.breachedActual - bucket.breachedReplay;
  }

  return { byBand, overall, replayReadAt };
}

export type Verdict = "strong" | "marginal" | "flat" | "worse" | "no-breaches";

/** Pre-registered. Fixed before results are seen, on purpose. */
export function verdictFor(counts: ReplayCounts): Verdict {
  if (counts.breachedActual === 0) return "no-breaches";
  if (counts.avoided < 0) return "worse";
  const frac = counts.avoided / counts.breachedActual;
  if (frac >= 0.25) return "strong";
  if (frac >= 0.1) return "marginal";
  return "flat";
}

export const VERDICT_COPY: Record<Verdict, string> = {
  strong:
    "Real effect on this department's data. Defensible as a sales asset, with the retrospective and single-centre caveats stated.",
  marginal:
    "Marginal. Segment by queue depth before concluding anything — the effect may be real but confined to the busiest periods.",
  flat: "Reordering is not moving the metric here. Check queue depth before assuming the model is at fault; an unqueued department has nothing to reorder.",
  worse:
    "Kroix's ordering performed worse than what the department actually did. The most valuable outcome available — find out why before building anything else.",
  "no-breaches":
    "No breaches in the actual data, so there is nothing to avoid. This department is not queue-constrained and is not the ICP.",
};

/* ────────────────────────────────────────────────────────────
   Expedite requests — the radiologist-facing metric
   ──────────────────────────────────────────────────────────── */

export interface ExpediteMechanism {
  /** Studies carrying an expedite request. */
  expedited: number;
  /** Studies with no expedite request. */
  notExpedited: number;
  /** Median wait (ms) of expedited studies. */
  medianWaitExpedited: number;
  /** Median wait (ms) of the rest. */
  medianWaitNotExpedited: number;
  /**
   * Ratio of the two medians. Above ~1.5 means expedites concentrate on
   * long-waiting cases, which is the mechanism claim: waiting causes calling.
   * Near 1.0 means calls are driven by something else and this whole line of
   * argument does not hold in this department.
   */
  ratio: number;
}

export interface ExpediteResult {
  mechanism: ExpediteMechanism;
  /** Expedite requests that still occur under the replay. */
  remaining: number;
  /**
   * Expedite requests avoided: the replay read the study BEFORE the moment
   * someone called about it, so the call never happens.
   */
  avoided: number;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Step 1 of the proof: does waiting actually cause calling *in this department*?
 *
 * Compares how long expedited studies waited against everything else. This must
 * be established before any claim about avoided interruptions means anything —
 * if expedites are not wait-driven here, reading sooner will not prevent them.
 */
export function expediteMechanism(rows: WorklistRow[]): ExpediteMechanism {
  const valid = rows.filter(
    (r) => r.expeditedAt === undefined || r.expeditedAt >= r.arrivedAt
  );
  const exp = valid.filter((r) => r.expeditedAt !== undefined);
  const not = valid.filter((r) => r.expeditedAt === undefined);

  const mExp = median(exp.map((r) => r.readAt - r.arrivedAt));
  const mNot = median(not.map((r) => r.readAt - r.arrivedAt));

  return {
    expedited: exp.length,
    notExpedited: not.length,
    medianWaitExpedited: mExp,
    medianWaitNotExpedited: mNot,
    ratio: mNot === 0 ? 0 : mExp / mNot,
  };
}

/**
 * Step 2: how many of those calls does the replay prevent?
 *
 * An expedite logged at time T is avoided when the replay finishes the study
 * before T — nobody had reason to pick up the phone. Ties count as NOT avoided,
 * since a read completing at the same instant would not have stopped the call.
 */
export function expediteAnalysis(
  rows: WorklistRow[],
  replayReadAt: Map<string, number>
): ExpediteResult {
  let avoided = 0;
  let remaining = 0;

  for (const r of rows) {
    if (r.expeditedAt === undefined) continue;
    if (r.expeditedAt < r.arrivedAt) continue; // malformed row, skip rather than count
    const rep = replayReadAt.get(r.studyId);
    if (rep !== undefined && rep < r.expeditedAt) avoided++;
    else remaining++;
  }

  return { mechanism: expediteMechanism(rows), avoided, remaining };
}

/**
 * Queue depth at each read slot — the number of studies waiting.
 *
 * Reported because the published literature finds triage benefit concentrated in
 * busy hours and statistically absent off-hours (2.8 min, p=0.345). An overall
 * figure that ignores depth hides the mechanism.
 */
export function queueDepths(rows: WorklistRow[]): number[] {
  const slots = rows.map((r) => r.readAt).sort((a, b) => a - b);
  const arrivals = rows.map((r) => r.arrivedAt).sort((a, b) => a - b);

  const depths: number[] = [];
  let arrived = 0;
  let read = 0;
  for (const slot of slots) {
    while (arrived < arrivals.length && arrivals[arrived] <= slot) arrived++;
    read++;
    depths.push(Math.max(0, arrived - read));
  }
  return depths;
}

/** Split rows by whether their slot sat in the busiest tercile of queue depth. */
export function segmentByDepth(rows: WorklistRow[]): { busy: WorklistRow[]; quiet: WorklistRow[] } {
  const depths = queueDepths(rows);
  if (depths.length === 0) return { busy: [], quiet: [] };
  const sorted = [...depths].sort((a, b) => a - b);
  const cut = sorted[Math.floor(sorted.length * (2 / 3))];

  const order = [...rows].sort((a, b) => a.readAt - b.readAt);
  const busy: WorklistRow[] = [];
  const quiet: WorklistRow[] = [];
  order.forEach((r, i) => (depths[i] >= cut && cut > 0 ? busy : quiet).push(r));
  return { busy, quiet };
}
