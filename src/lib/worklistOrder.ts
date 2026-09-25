/**
 * Worklist ordering — the single place that decides what a radiologist reads next.
 *
 * This module exists because the ordering was previously spread across three
 * layers that each sorted and none of which agreed:
 *
 *   1. `useStudies` asked Postgres for `created_at DESC`;
 *   2. `useRealTimeStudies` re-sorted by risk bucket with no tiebreak, so the
 *      DB's newest-first order survived inside each bucket — LIFO;
 *   3. `Index.tsx` re-sorted again and negated the result, which flipped a rank
 *      where 0 already meant CRITICAL and put CLEAR on top.
 *
 * The net effect in the default view was: pending first, then CLEAR, then
 * REVIEW, with CRITICAL at the bottom, newest critical above oldest critical.
 * Exactly backwards on both axes. Nothing typechecked wrong; the two sorts just
 * disagreed and JS sort stability decided the rest.
 *
 * So: ordering lives here, is pure, and is tested. The hook no longer sorts.
 * The page owns the user's sort controls and calls `sortWorklist`.
 *
 * Targets and the breach predicate are imported from `@/validation/slaReplay`
 * rather than restated, so the live worklist and the SLA replay cannot drift
 * apart. That module is pure, dependency-free TypeScript and already tested.
 */

import {
  DEFAULT_TARGETS,
  breached,
  type Band,
  type Targets,
  type WorklistRow,
} from "@/validation/slaReplay";
import type { RiskBucket, WorklistItem } from "@/lib/types";

/* ────────────────────────────────────────────────────────────
   Targets
   ──────────────────────────────────────────────────────────── */

/**
 * Read-time targets used by the live worklist.
 *
 * A CONSTANT ON PURPOSE. Real departments have their own SLA and these differ
 * per site, per shift and per modality — that needs a `site_targets` table and
 * a migration, and it is deliberately out of scope here. Until that exists,
 * every number this module produces is "against a common default target", not
 * "against your department's SLA", and the UI must say so.
 */
export const WORKLIST_TARGETS: Targets = DEFAULT_TARGETS;

/**
 * How often the page recomputes "now" and therefore re-sorts.
 *
 * 30s. The reasoning has two sides and they pull in opposite directions:
 *
 * - Honesty: the tightest target is 30 minutes, and the row displays whole
 *   minutes, so a 30s tick means the displayed remaining time is never stale by
 *   more than the display's own resolution.
 * - Safety: rows reordering under a radiologist's cursor mid-click is a real
 *   hazard on a clinical worklist — you aim at one study and open another.
 *   Re-sorting at most twice a minute bounds how often that can happen. A
 *   per-second or per-frame clock would make it routine, and buys nothing
 *   because the display cannot show the difference.
 */
export const WORKLIST_TICK_MS = 30_000;

/* ────────────────────────────────────────────────────────────
   Vocabulary: risk_bucket (model output) → Band (clinical acuity)
   ──────────────────────────────────────────────────────────── */

/**
 * `risk_bucket` and `Band` are deliberately different vocabularies and this
 * function is the only place they meet.
 *
 * `risk_bucket` is what the ensemble emitted for an image. `Band` is a clinical
 * acuity class that carries a read-time target. Mapping one onto the other is a
 * *policy* choice — it asserts that a model saying CRITICAL should be read on
 * the 30-minute clock — not a fact the model established. Aliasing the two types
 * would have hidden that choice inside a cast.
 *
 * Returns `null` for anything unrecognised, including a study with no triage
 * result yet. Callers must handle `null` rather than defaulting it; see the
 * UNSCORED note below.
 */
export function bandForBucket(bucket: RiskBucket | null | undefined): Band | null {
  switch (bucket) {
    case "CRITICAL":
      return "critical";
    case "REVIEW":
      return "medium";
    case "CLEAR":
      return "routine";
    default:
      return null;
  }
}

/** Urgency rank for the "Priority" sort. 0 is the most urgent. */
const BAND_RANK: Record<Band, number> = {
  critical: 0,
  medium: 1,
  routine: 2,
};

/* ────────────────────────────────────────────────────────────
   Arrival time
   ──────────────────────────────────────────────────────────── */

/**
 * Epoch ms this study is treated as having entered the worklist.
 *
 * ⚠ `study_time` IS UPLOAD TIME, NOT ARRIVAL TIME. `useUploadDicom` sets it to
 * `new Date().toISOString()` at the moment of insert. It is therefore when the
 * file reached Kroix, not when the patient was imaged and not when the study
 * landed in the department's worklist.
 *
 * Using it as arrival is defensible today because the only way a study gets in
 * here is a manual upload, so the two coincide. It stops being true the moment a
 * real DICOM C-STORE or HL7 ORM feed lands: then a study can be acquired hours
 * before it reaches us, and every elapsed time computed here will be short —
 * i.e. optimistic, i.e. wrong in the direction that flatters the product.
 *
 * When that feed exists, this function is what changes: give `studies` a real
 * acquisition/arrival column and read it here. Nothing else in the ordering
 * needs to know.
 *
 * Returns `NaN` if no usable timestamp exists; callers treat that as unrankable.
 */
export function arrivedAtOf(item: WorklistItem): number {
  const uploaded = Date.parse(item.study.study_time);
  if (Number.isFinite(uploaded)) return uploaded;
  // study_time is NOT NULL in schema, but a malformed value should degrade to
  // the row's insert time rather than to 0 (which would read as "waiting since
  // 1970" and shoot the row to the top of the list).
  const created = Date.parse(item.study.created_at);
  return Number.isFinite(created) ? created : Number.NaN;
}

/* ────────────────────────────────────────────────────────────
   Time to target
   ──────────────────────────────────────────────────────────── */

export type TargetTone = "ok" | "approaching" | "over" | "none";

export interface TargetState {
  band: Band;
  /** The band's target in ms. */
  target: number;
  /** ms elapsed since arrival (see the caveat on `arrivedAtOf`). */
  elapsed: number;
  /** Positive: ms of headroom left. Negative: ms past the target. */
  remaining: number;
  /** True iff the read-time target has been missed, per `breached()`. */
  over: boolean;
  tone: TargetTone;
}

/**
 * Fraction of the target remaining below which a row is "approaching".
 * 0.25 — the last quarter of the window. Arbitrary but fixed, and it only
 * drives a colour, never the ordering.
 */
const APPROACHING_FRACTION = 0.25;

/**
 * Shape a `WorklistItem` into the row type `slaReplay` already understands, so
 * the live worklist can use the same tested breach predicate the replay uses.
 * `readAt` is the hypothetical "if it were read right now".
 */
function asReplayRow(item: WorklistItem, band: Band, arrivedAt: number): WorklistRow {
  return {
    studyId: item.study.id,
    arrivedAt,
    // Unused by `breached`, which takes readAt as its own argument. Set to
    // arrivedAt rather than 0 so the row is never internally inconsistent.
    readAt: arrivedAt,
    band,
    score: item.triage?.risk_score ?? 0,
  };
}

/**
 * Where this study stands against its read-time target, as of `now`.
 *
 * Returns `null` when the study has no band (no triage result yet) or no usable
 * arrival time — there is no target to be near, and inventing one would be the
 * kind of confident-looking wrong number this repo has shipped before.
 */
export function targetStateOf(
  item: WorklistItem,
  now: number,
  targets: Targets = WORKLIST_TARGETS
): TargetState | null {
  const band = bandForBucket(item.triage?.risk_bucket);
  if (!band) return null;

  const arrivedAt = arrivedAtOf(item);
  if (!Number.isFinite(arrivedAt)) return null;

  const target = targets[band];
  const elapsed = now - arrivedAt;
  const remaining = target - elapsed;

  // `breached` is imported rather than reimplemented: the row a radiologist sees
  // and the number a buyer is shown must use one predicate, including at the
  // boundary (exactly-at-target is NOT a breach, strict `>`).
  const over = breached(asReplayRow(item, band, arrivedAt), now, targets);

  const tone: TargetTone = over
    ? "over"
    : remaining <= target * APPROACHING_FRACTION
    ? "approaching"
    : "ok";

  return { band, target, elapsed, remaining, over, tone };
}

/* ────────────────────────────────────────────────────────────
   Sorting
   ──────────────────────────────────────────────────────────── */

export type SortField = "target" | "priority" | "score" | "time" | "studyId";

/**
 * Which end of the ordering goes on top.
 *
 * Named for what the radiologist sees, NOT for the sign of a subtraction. The
 * defect this replaces was exactly that confusion: `-cmp` applied to a rank
 * where 0 already meant CRITICAL read as "descending" and rendered as "least
 * urgent first". A boolean called `desc` cannot tell you it is backwards;
 * `"urgent-first"` can.
 *
 * Every field's comparator below is written so its *unreversed* result is the
 * urgent-first one. `"relaxed-first"` reverses it. "Study ID" carries no urgency
 * — there it means A→Z and Z→A respectively, and the UI labels it that way.
 */
export type WorklistOrder = "urgent-first" | "relaxed-first";

export interface OrderOptions {
  field: SortField;
  order: WorklistOrder;
  /** Epoch ms. Supplied by the page's clock so the sort and the row display agree. */
  now: number;
  targets?: Targets;
}

/**
 * UNSCORED STUDIES — a deliberate, pinned position.
 *
 * A study with no triage result has no band, therefore no target. It is
 * *unclassified*, which is not the same as low-acuity, and this module does not
 * claim otherwise. But it still has to go somewhere, and both ends fail
 * differently:
 *
 * - Top: any inference outage or backlog pushes every fresh upload above a
 *   CRITICAL study that is minutes from breaching. "The model is down" silently
 *   becomes "everything is urgent", which is the same as having no triage.
 * - Bottom: an unclassified study can age quietly.
 *
 * Bottom is chosen because its failure is visible elsewhere — the page header
 * counts Pending studies and each row shows how long it has been awaiting
 * triage — whereas the top failure destroys the ordering the product exists to
 * provide, silently. They are pinned in BOTH directions so the position can
 * never become an accident of a negated comparison, which is the bug class this
 * whole module replaces.
 */
function isUnrankable(item: WorklistItem): boolean {
  return (
    bandForBucket(item.triage?.risk_bucket) === null ||
    !Number.isFinite(arrivedAtOf(item))
  );
}

/**
 * Tiebreak: longest-waiting first, then study id for total determinism.
 *
 * NEVER reversed by `order`. LIFO is the worst available ordering against a
 * read-time target — the newest study has the most headroom by construction —
 * so within any group of equals, the one that has waited longest wins whichever
 * way the toggle points. The study id fallback exists so the result is a total
 * order and does not depend on JS sort stability, which is what the two
 * competing sorts were silently relying on.
 */
function compareTiebreak(a: WorklistItem, b: WorklistItem): number {
  const aAt = arrivedAtOf(a);
  const bAt = arrivedAtOf(b);
  if (Number.isFinite(aAt) && Number.isFinite(bAt) && aAt !== bAt) {
    return aAt - bAt; // oldest first
  }
  return a.study.id.localeCompare(b.study.id);
}

/** Unreversed = urgent-first, for every field. Returns 0 when the field cannot separate them. */
function comparePrimary(
  a: WorklistItem,
  b: WorklistItem,
  opts: OrderOptions,
  targets: Targets
): number {
  switch (opts.field) {
    case "target": {
      // Least headroom first. A study 20 minutes past its target (remaining
      // -20m) sorts above one with 5 minutes left, which is the product thesis:
      // proximity to the read-time target, not arrival and not score alone.
      const at = targetStateOf(a, opts.now, targets)!.remaining;
      const bt = targetStateOf(b, opts.now, targets)!.remaining;
      return at - bt;
    }
    case "priority": {
      const ab = bandForBucket(a.triage?.risk_bucket)!;
      const bb = bandForBucket(b.triage?.risk_bucket)!;
      return BAND_RANK[ab] - BAND_RANK[bb];
    }
    case "score":
      // Highest risk score first — urgent-first, so this subtraction is the
      // other way round from the rank ones on purpose.
      return (b.triage?.risk_score ?? 0) - (a.triage?.risk_score ?? 0);
    case "time":
      // Longest waiting first.
      return arrivedAtOf(a) - arrivedAtOf(b);
    case "studyId":
      // No urgency meaning; "urgent-first" is simply A→Z here.
      return a.study.id.localeCompare(b.study.id);
    default:
      return 0;
  }
}

/** The comparator. Pure, total, and the only ordering authority in the app. */
export function compareWorklistItems(
  a: WorklistItem,
  b: WorklistItem,
  opts: OrderOptions
): number {
  const targets = opts.targets ?? WORKLIST_TARGETS;

  const aUnranked = isUnrankable(a);
  const bUnranked = isUnrankable(b);
  if (aUnranked && bUnranked) return compareTiebreak(a, b);
  if (aUnranked) return 1; // pinned below, both directions
  if (bUnranked) return -1;

  const primary = comparePrimary(a, b, opts, targets);
  if (primary !== 0) return opts.order === "urgent-first" ? primary : -primary;

  // Tiebreak is NOT reversed — see compareTiebreak.
  return compareTiebreak(a, b);
}

/** Non-mutating sort. */
export function sortWorklist(items: WorklistItem[], opts: OrderOptions): WorklistItem[] {
  return [...items].sort((a, b) => compareWorklistItems(a, b, opts));
}

/* ────────────────────────────────────────────────────────────
   Display helpers (kept here so the row and the sort agree)
   ──────────────────────────────────────────────────────────── */

/** "3h 10m", "45m", "<1m". Absolute value; the caller supplies over/left wording. */
export function formatDuration(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 60_000);
  if (total < 1) return "<1m";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Short row label: "22m left" / "18m over". */
export function formatTargetLabel(state: TargetState): string {
  return state.over
    ? `${formatDuration(state.remaining)} over`
    : `${formatDuration(state.remaining)} left`;
}

const BAND_LABEL: Record<Band, string> = {
  critical: "Critical",
  medium: "Medium",
  routine: "Routine",
};

/**
 * Tooltip text. States both caveats every time, because a bare countdown on a
 * clinical worklist reads as the department's SLA clock and it is not one.
 */
export function describeTarget(state: TargetState | null): string {
  if (!state) {
    return "No read-time target yet — this study has not been triaged, so it has no acuity band. Sorted below scored studies; see the Pending count above.";
  }
  return (
    `${BAND_LABEL[state.band]} target ${formatDuration(state.target)} ` +
    `(Kroix default, not this department's SLA). ` +
    `Elapsed ${formatDuration(state.elapsed)}, measured from UPLOAD time — ` +
    `not the department's arrival time.`
  );
}
