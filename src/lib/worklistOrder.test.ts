import { describe, it, expect } from "vitest";
import {
  compareWorklistItems,
  sortWorklist,
  bandForBucket,
  arrivedAtOf,
  targetStateOf,
  formatDuration,
  formatTargetLabel,
  describeTarget,
  WORKLIST_TARGETS,
  WORKLIST_TICK_MS,
  type OrderOptions,
} from "./worklistOrder";
import { DEFAULT_TARGETS, MINUTES, HOURS, breached } from "@/validation/slaReplay";
import type { RiskBucket, WorklistItem } from "@/lib/types";

/**
 * This is the ordering a radiologist uses to decide what to read next, so a
 * silently-wrong comparator is not a styling bug.
 *
 * The defect these tests exist to make impossible to reintroduce: three layers
 * each sorted, the page negated a rank where 0 already meant CRITICAL, and the
 * default view rendered pending → CLEAR → REVIEW → CRITICAL, newest-first
 * inside each bucket. Every line of it typechecked.
 *
 * The invariants under test are therefore stated as what the radiologist sees,
 * not as the sign of a subtraction.
 */

const T0 = Date.parse("2026-09-25T12:00:00.000Z");

function item(
  id: string,
  bucket: RiskBucket | null,
  uploadedMinutesAgo: number,
  score = 0.5
): WorklistItem {
  const uploadedAt = new Date(T0 - uploadedMinutesAgo * MINUTES).toISOString();
  return {
    study: {
      id,
      patient_hash: `P-${id}`,
      study_time: uploadedAt,
      modality: "CXR",
      file_path: null,
      thumbnail_path: null,
      status: "QUEUED",
      site_id: "pilot-1",
      created_at: uploadedAt,
      updated_at: uploadedAt,
    },
    triage: bucket
      ? {
          id: `tr-${id}`,
          study_id: id,
          risk_score: score,
          risk_bucket: bucket,
          confidence: 0.9,
          roi_heatmap_path: null,
          model_version: "test",
          inference_time_ms: 10,
          created_at: uploadedAt,
        }
      : null,
    labs: null,
  };
}

const ids = (xs: WorklistItem[]) => xs.map((x) => x.study.id);
const opts = (o: Partial<OrderOptions> = {}): OrderOptions => ({
  field: "target",
  order: "urgent-first",
  now: T0,
  ...o,
});

/* ────────────────────────────────────────────────────────────
   Regression: the exact inversion that shipped
   ──────────────────────────────────────────────────────────── */

describe("the default view — most urgent first", () => {
  /**
   * This is the shipped defect, written down. Under the old pipeline this exact
   * input rendered as: unscored, clear, review, new-critical, old-critical.
   */
  const shipped = [
    item("old-critical", "CRITICAL", 240),
    item("new-critical", "CRITICAL", 5),
    item("review", "REVIEW", 180),
    item("clear", "CLEAR", 120),
    item("unscored", null, 300),
  ];

  it("does not put CLEAR on top", () => {
    const out = sortWorklist(shipped, opts());
    expect(out[0].study.id).not.toBe("clear");
    expect(out[0].triage?.risk_bucket).toBe("CRITICAL");
  });

  it("does not put CRITICAL at the bottom", () => {
    const out = sortWorklist(shipped, opts());
    expect(out[out.length - 1].triage?.risk_bucket).not.toBe("CRITICAL");
  });

  it("puts the most overdue critical study first", () => {
    // old-critical: 240m elapsed against a 30m target — 210m over.
    // new-critical: 5m elapsed — 25m of headroom left.
    const out = sortWorklist(shipped, opts());
    expect(out[0].study.id).toBe("old-critical");
  });

  it("orders the whole list by proximity to target", () => {
    // critical 30m / medium 4h / routine 24h against 240/5/180/120 minutes.
    //   old-critical  -210m   (most overdue)
    //   review        +60m
    //   new-critical  +25m    <- tighter than review, despite arriving later
    //   clear        +1320m
    // So new-critical must sit ABOVE review even though review waited longer,
    // which is the whole point: this is not a bucket sort and not FIFO.
    expect(ids(sortWorklist(shipped, opts()))).toEqual([
      "old-critical",
      "new-critical",
      "review",
      "clear",
      "unscored",
    ]);
  });

  it("puts CRITICAL first under the Priority field too", () => {
    const out = sortWorklist(shipped, opts({ field: "priority" }));
    expect(out[0].triage?.risk_bucket).toBe("CRITICAL");
    expect(ids(out)).toEqual([
      "old-critical", // oldest critical wins the within-bucket tie
      "new-critical",
      "review",
      "clear",
      "unscored",
    ]);
  });
});

/* ────────────────────────────────────────────────────────────
   Longest-waiting-first within a group
   ──────────────────────────────────────────────────────────── */

describe("within a group, longest waiting first — never LIFO", () => {
  const sameBucket = [
    item("newest", "CRITICAL", 1),
    item("oldest", "CRITICAL", 90),
    item("middle", "CRITICAL", 45),
  ];

  it("breaks a Priority tie by arrival, oldest first", () => {
    expect(ids(sortWorklist(sameBucket, opts({ field: "priority" })))).toEqual([
      "oldest",
      "middle",
      "newest",
    ]);
  });

  it("keeps the oldest first even when the order is reversed", () => {
    // The tiebreak is deliberately NOT reversed. Reversing it would turn every
    // group into LIFO, which is the worst available ordering against a
    // read-time target — the newest study has the most headroom by construction.
    expect(
      ids(sortWorklist(sameBucket, opts({ field: "priority", order: "relaxed-first" })))
    ).toEqual(["oldest", "middle", "newest"]);
  });

  it("breaks a Score tie by arrival, oldest first", () => {
    const tied = [
      item("b-new", "REVIEW", 2, 0.61),
      item("a-old", "REVIEW", 200, 0.61),
    ];
    expect(ids(sortWorklist(tied, opts({ field: "score" })))).toEqual(["a-old", "b-new"]);
  });

  it("is a total order — equal arrival falls back to study id, not sort stability", () => {
    const simultaneous = [
      item("zz", "CLEAR", 10),
      item("aa", "CLEAR", 10),
      item("mm", "CLEAR", 10),
    ];
    const forwards = ids(sortWorklist(simultaneous, opts({ field: "priority" })));
    const backwards = ids(sortWorklist([...simultaneous].reverse(), opts({ field: "priority" })));
    expect(forwards).toEqual(["aa", "mm", "zz"]);
    expect(backwards).toEqual(forwards);
  });

  it("'Wait time' means longest waiting first", () => {
    expect(ids(sortWorklist(sameBucket, opts({ field: "time" })))).toEqual([
      "oldest",
      "middle",
      "newest",
    ]);
  });
});

/* ────────────────────────────────────────────────────────────
   Unscored studies
   ──────────────────────────────────────────────────────────── */

describe("unscored studies sort last, in both directions, deliberately", () => {
  const mixed = [
    item("pending-ancient", null, 1000),
    item("clear-fresh", "CLEAR", 1),
    item("pending-fresh", null, 1),
    item("critical-fresh", "CRITICAL", 1),
  ];

  it("never outranks a scored study, however long it has waited", () => {
    const out = ids(sortWorklist(mixed, opts()));
    expect(out.slice(0, 2)).toEqual(["critical-fresh", "clear-fresh"]);
    expect(out.slice(2)).toEqual(["pending-ancient", "pending-fresh"]);
  });

  it("stays at the bottom when the order is reversed", () => {
    // Pinned, so the position can never become an accident of a negated
    // comparison — the bug class this module replaces. A model outage must not
    // silently float every fresh upload above a breaching CRITICAL study.
    const out = ids(sortWorklist(mixed, opts({ order: "relaxed-first" })));
    expect(out.slice(2)).toEqual(["pending-ancient", "pending-fresh"]);
  });

  it("stays at the bottom for every sort field", () => {
    for (const field of ["target", "priority", "score", "time", "studyId"] as const) {
      const out = ids(sortWorklist(mixed, opts({ field })));
      expect(out.slice(2).sort()).toEqual(["pending-ancient", "pending-fresh"]);
    }
  });

  it("orders untriaged studies among themselves oldest-first", () => {
    const out = ids(sortWorklist(mixed, opts()));
    expect(out.slice(2)).toEqual(["pending-ancient", "pending-fresh"]);
  });

  it("treats a study with an unusable arrival time as unrankable rather than ancient", () => {
    // A 0 / NaN timestamp must not read as "waiting since 1970" and take the
    // top of a clinical worklist.
    const broken = item("broken", "CRITICAL", 5);
    broken.study.study_time = "not-a-date";
    broken.study.created_at = "not-a-date";
    expect(Number.isFinite(arrivedAtOf(broken))).toBe(false);
    const out = ids(sortWorklist([broken, item("ok", "CLEAR", 1)], opts()));
    expect(out).toEqual(["ok", "broken"]);
  });

  it("falls back to created_at when study_time is malformed", () => {
    const patched = item("patched", "CRITICAL", 5);
    patched.study.study_time = "";
    expect(arrivedAtOf(patched)).toBe(Date.parse(patched.study.created_at));
  });
});

/* ────────────────────────────────────────────────────────────
   The direction toggle
   ──────────────────────────────────────────────────────────── */

describe("the order toggle works, and means the same thing on every field", () => {
  const rows = [
    item("critical", "CRITICAL", 10, 0.95),
    item("review", "REVIEW", 10, 0.6),
    item("clear", "CLEAR", 10, 0.1),
  ];

  it("reverses Priority", () => {
    expect(ids(sortWorklist(rows, opts({ field: "priority" })))).toEqual([
      "critical", "review", "clear",
    ]);
    expect(ids(sortWorklist(rows, opts({ field: "priority", order: "relaxed-first" })))).toEqual([
      "clear", "review", "critical",
    ]);
  });

  it("reverses Time to target", () => {
    expect(ids(sortWorklist(rows, opts({ field: "target" })))).toEqual([
      "critical", "review", "clear",
    ]);
    expect(ids(sortWorklist(rows, opts({ field: "target", order: "relaxed-first" })))).toEqual([
      "clear", "review", "critical",
    ]);
  });

  it("means highest score first on Score — urgent-first, not literal ascending", () => {
    expect(ids(sortWorklist(rows, opts({ field: "score" })))).toEqual([
      "critical", "review", "clear",
    ]);
    expect(ids(sortWorklist(rows, opts({ field: "score", order: "relaxed-first" })))).toEqual([
      "clear", "review", "critical",
    ]);
  });

  it("reverses Study ID as A→Z / Z→A", () => {
    const abc = [item("c", "CLEAR", 5), item("a", "CLEAR", 5), item("b", "CLEAR", 5)];
    expect(ids(sortWorklist(abc, opts({ field: "studyId" })))).toEqual(["a", "b", "c"]);
    expect(ids(sortWorklist(abc, opts({ field: "studyId", order: "relaxed-first" })))).toEqual([
      "c", "b", "a",
    ]);
  });

  it("is antisymmetric on the primary key", () => {
    const a = item("a", "CRITICAL", 10);
    const b = item("b", "CLEAR", 10);
    const fwd = compareWorklistItems(a, b, opts({ field: "priority" }));
    const rev = compareWorklistItems(a, b, opts({ field: "priority", order: "relaxed-first" }));
    expect(fwd).toBeLessThan(0);
    expect(rev).toBeGreaterThan(0);
  });
});

/* ────────────────────────────────────────────────────────────
   Bands, targets, and agreement with the replay engine
   ──────────────────────────────────────────────────────────── */

describe("risk_bucket → Band is an explicit policy mapping", () => {
  it("maps each bucket to exactly one acuity band", () => {
    expect(bandForBucket("CRITICAL")).toBe("critical");
    expect(bandForBucket("REVIEW")).toBe("medium");
    expect(bandForBucket("CLEAR")).toBe("routine");
  });

  it("returns null rather than guessing for an absent or unknown bucket", () => {
    expect(bandForBucket(null)).toBeNull();
    expect(bandForBucket(undefined)).toBeNull();
    expect(bandForBucket("SOMETHING_NEW" as RiskBucket)).toBeNull();
  });
});

describe("time-to-target reuses the replay engine rather than restating it", () => {
  it("uses slaReplay's targets unchanged", () => {
    expect(WORKLIST_TARGETS).toBe(DEFAULT_TARGETS);
    expect(WORKLIST_TARGETS.critical).toBe(30 * MINUTES);
    expect(WORKLIST_TARGETS.medium).toBe(4 * HOURS);
    expect(WORKLIST_TARGETS.routine).toBe(24 * HOURS);
  });

  it("agrees with breached() at the boundary, including the strict inequality", () => {
    const exactly = item("exact", "CRITICAL", 30);
    const oneMsPast = item("past", "CRITICAL", 30);
    oneMsPast.study.study_time = new Date(T0 - 30 * MINUTES - 1).toISOString();

    const sExact = targetStateOf(exactly, T0)!;
    const sPast = targetStateOf(oneMsPast, T0)!;

    expect(sExact.remaining).toBe(0);
    expect(sExact.over).toBe(false);
    expect(sPast.over).toBe(true);

    // Same predicate, called directly — display and metric cannot drift.
    const row = {
      studyId: "exact",
      arrivedAt: arrivedAtOf(exactly),
      readAt: T0,
      band: "critical" as const,
      score: 0.5,
    };
    expect(breached(row, T0, DEFAULT_TARGETS)).toBe(false);
  });

  it("reports overdue studies as negative remaining, not zero", () => {
    const s = targetStateOf(item("x", "CRITICAL", 90), T0)!;
    expect(s.remaining).toBe(-60 * MINUTES);
    expect(s.tone).toBe("over");
  });

  it("flags the last quarter of the window as approaching", () => {
    expect(targetStateOf(item("x", "CRITICAL", 20), T0)!.tone).toBe("ok");
    expect(targetStateOf(item("x", "CRITICAL", 23), T0)!.tone).toBe("approaching");
  });

  it("has no target for an untriaged study", () => {
    expect(targetStateOf(item("x", null, 10), T0)).toBeNull();
  });
});

/* ────────────────────────────────────────────────────────────
   The clock, and what the row says about its own number
   ──────────────────────────────────────────────────────────── */

describe("the ticking clock", () => {
  it("ticks no faster than every 30s and no slower than every minute", () => {
    // Fast enough that a whole-minute display is never stale by more than its
    // own resolution; slow enough that rows cannot reorder under a cursor
    // mid-click more than twice a minute.
    expect(WORKLIST_TICK_MS).toBeGreaterThanOrEqual(30_000);
    expect(WORKLIST_TICK_MS).toBeLessThanOrEqual(60_000);
  });

  it("re-sorts as the clock advances, without any data changing", () => {
    // Two studies with the same band; the sort must respond to elapsed time.
    const rows = [item("later", "CRITICAL", 10), item("sooner", "CRITICAL", 25)];
    expect(ids(sortWorklist(rows, opts({ now: T0 })))).toEqual(["sooner", "later"]);
    // An hour later both are over target; the more overdue one is still on top.
    const s = targetStateOf(rows[1], T0 + HOURS)!;
    expect(s.over).toBe(true);
    expect(ids(sortWorklist(rows, opts({ now: T0 + HOURS })))).toEqual(["sooner", "later"]);
  });
});

describe("the row states its caveats rather than implying authority", () => {
  it("formats durations at whole-minute resolution", () => {
    expect(formatDuration(0)).toBe("<1m");
    expect(formatDuration(45 * MINUTES)).toBe("45m");
    expect(formatDuration(3 * HOURS)).toBe("3h");
    expect(formatDuration(3 * HOURS + 10 * MINUTES)).toBe("3h 10m");
    expect(formatDuration(-18 * MINUTES)).toBe("18m");
  });

  it("says 'left' inside the window and 'over' outside it", () => {
    expect(formatTargetLabel(targetStateOf(item("x", "CRITICAL", 8), T0)!)).toBe("22m left");
    expect(formatTargetLabel(targetStateOf(item("x", "CRITICAL", 48), T0)!)).toBe("18m over");
  });

  it("names both caveats every time: default target, and upload-not-arrival", () => {
    const text = describeTarget(targetStateOf(item("x", "CRITICAL", 8), T0));
    expect(text).toMatch(/not this department's SLA/i);
    expect(text).toMatch(/UPLOAD time/i);
    expect(text).toMatch(/not the department's arrival time/i);
  });

  it("explains an untriaged row instead of showing a fabricated countdown", () => {
    const text = describeTarget(null);
    expect(text).toMatch(/No read-time target yet/i);
    expect(text).not.toMatch(/\d+m (left|over)/);
  });
});
