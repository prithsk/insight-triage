import { useMemo } from "react";
import { useStudies, type StudyWithTriage } from "@/hooks/useStudies";
import { bandForBucket, WORKLIST_TARGETS } from "@/lib/worklistOrder";
import { breached, type Band, type Targets } from "@/validation/slaReplay";

/**
 * Read-time target metrics, computed from studies this workspace has actually
 * reviewed.
 *
 * WHY THIS EXISTS. The analytics page measured average time to review, average
 * throughput, override rate and feedback quality. None of those is the thing
 * this product claims to move. Kroix reorders a queue so studies get read
 * inside their read-time target; the number that tests that claim is how many
 * MISSED, and it appeared nowhere in the app — while `slaReplay.ts` had
 * computed exactly it since the validation work.
 *
 * Throughput was worse than absent, it was misleading. Kroix does not make a
 * radiologist read faster, it changes what they read first, and the SLA replay
 * holds throughput FIXED because that is the only way the comparison means
 * anything. A `scans/hr` tile invites the reading that Kroix moves it — the
 * same claim torn out of the landing page on 2026-07-30.
 *
 * NOT A COMPARISON. These are counts of what happened in this workspace. They
 * say nothing about what would have happened without Kroix; that needs the SLA
 * replay over a real historical worklist. The page must not imply otherwise.
 *
 * `breached()` and the targets are imported rather than reimplemented, for the
 * same reason `worklistOrder` imports them: if the analytics page and the
 * validation engine ever disagree about what "late" means, the number on screen
 * stops being the number that was measured.
 */

export interface BandMetrics {
  band: Band;
  label: string;
  /** Reviewed studies in this band. */
  total: number;
  /** Read inside the target. */
  inside: number;
  /** Read outside the target. */
  missed: number;
  /** Target window in ms. */
  target: number;
  /** Median time to read, ms. Median not mean — see the note in the hook. */
  medianMs: number | null;
  /** Slowest read in the band, ms. The tail is the point. */
  worstMs: number | null;
}

export interface TargetMetrics {
  /** False until at least one study has been reviewed. No empty-state guessing. */
  hasData: boolean;
  reviewed: number;
  inside: number;
  missed: number;
  /** 0–100. Null when nothing has been reviewed — never 0, which reads as failure. */
  insideRate: number | null;
  bands: BandMetrics[];
  /** Reviewed studies that carry no score, so no band and no target. */
  unscoredReviewed: number;
  /**
   * Studies marked reviewed before `reviewed_at` existed (migration
   * 20261004120000). Their real read time is unknown, so they are excluded from
   * attainment rather than timed by a proxy.
   */
  untimedReviewed: number;
  isLoading: boolean;
  error: Error | null;
}

const BAND_LABEL: Record<Band, string> = {
  critical: "Critical",
  medium: "Review",
  routine: "Clear",
};

const BAND_ORDER: Band[] = ["critical", "medium", "routine"];

/**
 * When a study was read: `reviewed_at`, set by a database trigger on the first
 * transition into REVIEWED and never changed after (see migration
 * 20261004120000_studies_reviewed_at.sql). It replaced `updated_at`, which any
 * later edit moved and which the browser supplied itself.
 *
 * There is deliberately NO fallback to `updated_at`. A study without
 * `reviewed_at` has no known read time, and timing it by the proxy would put the
 * old error back under the new name. Such studies are counted, not timed.
 */
function readAtOf(s: StudyWithTriage): number {
  if (!s.reviewed_at) return Number.NaN;
  const t = Date.parse(s.reviewed_at);
  return Number.isFinite(t) ? t : Number.NaN;
}

function arrivedAtOf(s: StudyWithTriage): number {
  const t = Date.parse(s.study_time);
  if (Number.isFinite(t)) return t;
  const created = Date.parse(s.created_at);
  return Number.isFinite(created) ? created : Number.NaN;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function useTargetMetrics(targets: Targets = WORKLIST_TARGETS): TargetMetrics {
  const { data: studies, isLoading, error } = useStudies();

  return useMemo(() => {
    const empty: TargetMetrics = {
      hasData: false, reviewed: 0, inside: 0, missed: 0, insideRate: null,
      bands: BAND_ORDER.map(b => ({
        band: b, label: BAND_LABEL[b], total: 0, inside: 0, missed: 0,
        target: targets[b], medianMs: null, worstMs: null,
      })),
      unscoredReviewed: 0,
      untimedReviewed: 0,
      isLoading,
      error: (error as Error) ?? null,
    };

    if (!studies || studies.length === 0) return empty;

    // A study counts as read if it HAS a read time, whatever its status now —
    // a reviewed study that was later archived was still read. The old
    // `status === "REVIEWED"` filter silently dropped those. Rows still marked
    // REVIEWED but with no `reviewed_at` predate the column.
    const reviewed = studies.filter(s => s.reviewed_at || s.status === "REVIEWED");
    if (reviewed.length === 0) return empty;

    const durations: Record<Band, number[]> = { critical: [], medium: [], routine: [] };
    const counts: Record<Band, { total: number; inside: number; missed: number }> = {
      critical: { total: 0, inside: 0, missed: 0 },
      medium: { total: 0, inside: 0, missed: 0 },
      routine: { total: 0, inside: 0, missed: 0 },
    };
    let unscoredReviewed = 0;
    let untimedReviewed = 0;

    for (const s of reviewed) {
      const band = bandForBucket(s.triage_results?.[0]?.risk_bucket);
      if (!band) { unscoredReviewed++; continue; }

      if (!s.reviewed_at) { untimedReviewed++; continue; }

      const arrivedAt = arrivedAtOf(s);
      const readAt = readAtOf(s);
      // A row with an unparseable timestamp is dropped rather than counted as
      // instant or as a breach. Either would be a number we invented.
      if (!Number.isFinite(arrivedAt) || !Number.isFinite(readAt) || readAt < arrivedAt) continue;

      counts[band].total++;
      durations[band].push(readAt - arrivedAt);
      // `score` is required by WorklistRow but `breached` reads only arrivedAt,
      // readAt and band. Pass the real score so nothing here is a placeholder.
      const row = {
        studyId: s.id,
        arrivedAt,
        readAt,
        band,
        score: s.triage_results?.[0]?.risk_score ?? 0,
      };
      if (breached(row, readAt, targets)) counts[band].missed++;
      else counts[band].inside++;
    }

    const bands: BandMetrics[] = BAND_ORDER.map(b => ({
      band: b,
      label: BAND_LABEL[b],
      total: counts[b].total,
      inside: counts[b].inside,
      missed: counts[b].missed,
      target: targets[b],
      // Median, not mean. A mean over a queue is dominated by the routine band,
      // which has a 24h window, so it stays comfortable while criticals miss a
      // 30-minute one. The tail is the thing that hurts a department.
      medianMs: median(durations[b]),
      worstMs: durations[b].length ? Math.max(...durations[b]) : null,
    }));

    const total = bands.reduce((n, b) => n + b.total, 0);
    const inside = bands.reduce((n, b) => n + b.inside, 0);
    const missed = bands.reduce((n, b) => n + b.missed, 0);

    return {
      hasData: total > 0,
      reviewed: total,
      inside,
      missed,
      insideRate: total > 0 ? (inside / total) * 100 : null,
      bands,
      unscoredReviewed,
      untimedReviewed,
      isLoading,
      error: (error as Error) ?? null,
    };
  }, [studies, targets, isLoading, error]);
}
