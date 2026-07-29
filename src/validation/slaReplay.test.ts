import { describe, it, expect } from "vitest";
import {
  replay,
  analyse,
  breached,
  verdictFor,
  queueDepths,
  segmentByDepth,
  byScore,
  byArrival,
  DEFAULT_TARGETS,
  MINUTES,
  HOURS,
  type WorklistRow,
  type Targets,
} from "./slaReplay";

/**
 * This engine produces the number a buyer is shown. A silently wrong breach count
 * is worse than no count: it is a confident, checkable claim that happens to be
 * false, and it would be found by the customer rather than by us.
 *
 * The load-bearing property under test is that throughput is held fixed — the
 * replay must never invent capacity. If it did, every result would look good.
 */

const T0 = 1_700_000_000_000; // arbitrary epoch anchor
const row = (
  id: string,
  arrivedMin: number,
  readMin: number,
  band: WorklistRow["band"],
  score: number
): WorklistRow => ({
  studyId: id,
  arrivedAt: T0 + arrivedMin * MINUTES,
  readAt: T0 + readMin * MINUTES,
  band,
  score,
});

describe("replay — throughput is held fixed", () => {
  it("reuses exactly the historical completion times, no more and no fewer", () => {
    const rows = [
      row("a", 0, 10, "routine", 0.1),
      row("b", 1, 20, "critical", 0.9),
      row("c", 2, 30, "medium", 0.5),
    ];
    const out = replay(rows, byScore);
    const assigned = [...out.values()].sort((x, y) => x - y);
    const actual = rows.map((r) => r.readAt).sort((x, y) => x - y);
    expect(assigned).toEqual(actual);
  });

  it("assigns every study exactly once", () => {
    const rows = [
      row("a", 0, 10, "routine", 0.1),
      row("b", 1, 20, "critical", 0.9),
      row("c", 2, 30, "medium", 0.5),
    ];
    const out = replay(rows, byScore);
    expect(out.size).toBe(3);
    expect(new Set(out.values()).size).toBe(3);
  });

  it("never reads a study before it arrived", () => {
    const rows = [
      row("late", 25, 30, "critical", 0.99),
      row("early", 0, 10, "routine", 0.1),
      row("mid", 5, 20, "medium", 0.5),
    ];
    const out = replay(rows, byScore);
    for (const r of rows) {
      expect(out.get(r.studyId)!).toBeGreaterThanOrEqual(r.arrivedAt);
    }
  });

  it("pulls a high-score late arrival forward once it is actually available", () => {
    // 'urgent' arrives at t=11, so it cannot take the t=10 slot, but should take
    // t=20 ahead of the two routine studies that arrived earlier.
    const rows = [
      row("r1", 0, 10, "routine", 0.1),
      row("r2", 1, 20, "routine", 0.1),
      row("urgent", 11, 30, "critical", 0.95),
    ];
    const out = replay(rows, byScore);
    expect(out.get("urgent")).toBe(T0 + 20 * MINUTES);
  });

  it("skips idle slots rather than inventing work", () => {
    // One study, one slot. Nothing waiting anywhere else.
    const rows = [row("only", 0, 5, "routine", 0.4)];
    const out = replay(rows, byScore);
    expect(out.get("only")).toBe(T0 + 5 * MINUTES);
  });

  it("breaks score ties by arrival, so ties do not become LIFO", () => {
    const rows = [
      row("first", 0, 10, "medium", 0.5),
      row("second", 1, 20, "medium", 0.5),
    ];
    const out = replay(rows, byScore);
    expect(out.get("first")).toBe(T0 + 10 * MINUTES);
    expect(out.get("second")).toBe(T0 + 20 * MINUTES);
  });

  it("byArrival reproduces the FIFO baseline exactly", () => {
    const rows = [
      row("a", 0, 10, "routine", 0.1),
      row("b", 1, 20, "critical", 0.9),
      row("c", 2, 30, "medium", 0.5),
    ];
    const out = replay(rows, byArrival);
    for (const r of rows) expect(out.get(r.studyId)).toBe(r.readAt);
  });
});

describe("breached", () => {
  const targets: Targets = { critical: 30 * MINUTES, medium: 4 * HOURS, routine: 24 * HOURS };

  it("is false exactly at the target and true past it", () => {
    const r = row("x", 0, 0, "critical", 0.5);
    expect(breached(r, r.arrivedAt + 30 * MINUTES, targets)).toBe(false);
    expect(breached(r, r.arrivedAt + 30 * MINUTES + 1, targets)).toBe(true);
  });

  it("applies the band's own window", () => {
    const med = row("m", 0, 0, "medium", 0.5);
    expect(breached(med, med.arrivedAt + 2 * HOURS, targets)).toBe(false);
    const crit = row("c", 0, 0, "critical", 0.5);
    expect(breached(crit, crit.arrivedAt + 2 * HOURS, targets)).toBe(true);
  });
});

describe("analyse", () => {
  it("counts avoided breaches when reordering rescues an urgent study", () => {
    // 'urgent' arrives first but was read last (breaching 30min); a routine study
    // took the early slot. Score-ordering swaps them.
    const rows = [
      row("urgent", 0, 90, "critical", 0.95),
      row("routine", 1, 10, "routine", 0.05),
    ];
    const res = analyse(rows, DEFAULT_TARGETS, byScore);
    expect(res.byBand.critical.breachedActual).toBe(1);
    expect(res.byBand.critical.breachedReplay).toBe(0);
    expect(res.byBand.critical.avoided).toBe(1);
  });

  it("reports a NEGATIVE avoided count when the replay is worse", () => {
    // Scores are inverted relative to true urgency: the model ranks the routine
    // study top, pushing the critical one late. This must surface, not be clamped.
    const rows = [
      row("critical", 0, 10, "critical", 0.05),
      row("routine", 1, 90, "routine", 0.95),
    ];
    const res = analyse(rows, DEFAULT_TARGETS, byScore);
    expect(res.byBand.critical.avoided).toBeLessThan(0);
  });

  it("leaves totals intact across bands", () => {
    const rows = [
      row("a", 0, 10, "critical", 0.9),
      row("b", 1, 20, "medium", 0.5),
      row("c", 2, 30, "routine", 0.1),
    ];
    const res = analyse(rows);
    expect(res.overall.total).toBe(3);
    expect(res.byBand.critical.total + res.byBand.medium.total + res.byBand.routine.total).toBe(3);
  });

  it("cannot manufacture an improvement when nothing breached", () => {
    const rows = [
      row("a", 0, 5, "critical", 0.9),
      row("b", 1, 6, "medium", 0.5),
    ];
    const res = analyse(rows);
    expect(res.overall.breachedActual).toBe(0);
    expect(res.overall.avoided).toBe(0);
  });
});

describe("verdictFor — pre-registered thresholds", () => {
  const c = (actual: number, avoided: number) => ({
    total: 100,
    breachedActual: actual,
    breachedReplay: actual - avoided,
    avoided,
  });

  it("calls >=25% strong", () => {
    expect(verdictFor(c(100, 25))).toBe("strong");
  });

  it("calls 10-25% marginal", () => {
    expect(verdictFor(c(100, 10))).toBe("marginal");
    expect(verdictFor(c(100, 24))).toBe("marginal");
  });

  it("calls <10% flat", () => {
    expect(verdictFor(c(100, 9))).toBe("flat");
  });

  it("calls a negative result worse, never flat", () => {
    expect(verdictFor(c(100, -5))).toBe("worse");
  });

  it("distinguishes no-breaches from no-improvement", () => {
    // An unqueued department is not a model failure; conflating them would send us
    // rebuilding the model when the real answer is 'wrong customer'.
    expect(verdictFor(c(0, 0))).toBe("no-breaches");
    expect(verdictFor(c(50, 0))).toBe("flat");
  });

  it("has no gap at the boundaries", () => {
    for (const avoided of [0, 9, 10, 24, 25, 26]) {
      expect(["strong", "marginal", "flat", "worse", "no-breaches"]).toContain(
        verdictFor(c(100, avoided))
      );
    }
  });
});

describe("discrimination — the metric must be able to fail", () => {
  /**
   * The property that makes a passing result mean anything: a good ordering, a
   * random one, and an inverted one must land in different verdict bands on the
   * same backlogged data. A metric that reports "strong" regardless is a sales
   * prop, not a measurement.
   */
  function synth(scoreFor: (band: WorklistRow["band"]) => number): WorklistRow[] {
    let s = 7;
    const rnd = () => {
      s = (s * 1103515245 + 12345) % 2147483648;
      return s / 2147483648;
    };
    const rows: WorklistRow[] = [];
    for (let i = 0; i < 120; i++) {
      const r = rnd();
      const band: WorklistRow["band"] = r < 0.12 ? "critical" : r < 0.5 ? "medium" : "routine";
      // arrivals every 4 min, reads every 9 min -> a genuine backlog
      rows.push({
        studyId: `s${i}`,
        band,
        score: scoreFor(band),
        arrivedAt: T0 + i * 4 * MINUTES,
        readAt: T0 + (i * 9 + 40) * MINUTES,
      });
    }
    return rows;
  }
  const truth = (b: WorklistRow["band"]) => (b === "critical" ? 0.9 : b === "medium" ? 0.55 : 0.15);

  it("rewards an ordering aligned with true urgency", () => {
    const m = analyse(synth(truth), DEFAULT_TARGETS, byScore).byBand.medium;
    expect(m.avoided).toBeGreaterThan(0);
    expect(verdictFor(m)).toBe("strong");
  });

  it("penalises an inverted ordering with a negative result", () => {
    const m = analyse(synth((b) => 1 - truth(b)), DEFAULT_TARGETS, byScore).byBand.medium;
    expect(m.avoided).toBeLessThan(0);
    expect(verdictFor(m)).toBe("worse");
  });

  it("separates a good ordering from an inverted one by a wide margin", () => {
    const good = analyse(synth(truth), DEFAULT_TARGETS, byScore).byBand.medium;
    const bad = analyse(synth((b) => 1 - truth(b)), DEFAULT_TARGETS, byScore).byBand.medium;
    expect(good.avoided - bad.avoided).toBeGreaterThan(20);
  });
});

describe("queue depth", () => {
  it("is zero when each study is read before the next arrives", () => {
    const rows = [
      row("a", 0, 1, "routine", 0.1),
      row("b", 10, 11, "routine", 0.1),
      row("c", 20, 21, "routine", 0.1),
    ];
    expect(queueDepths(rows).every((d) => d === 0)).toBe(true);
  });

  it("grows when arrivals outpace reads", () => {
    const rows = [
      row("a", 0, 50, "routine", 0.1),
      row("b", 1, 60, "routine", 0.1),
      row("c", 2, 70, "routine", 0.1),
    ];
    const d = queueDepths(rows);
    expect(Math.max(...d)).toBeGreaterThan(0);
  });

  it("segments without losing or duplicating rows", () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      row(`s${i}`, i, i + 30, "medium", 0.5)
    );
    const { busy, quiet } = segmentByDepth(rows);
    expect(busy.length + quiet.length).toBe(rows.length);
    const ids = new Set([...busy, ...quiet].map((r) => r.studyId));
    expect(ids.size).toBe(rows.length);
  });
});
