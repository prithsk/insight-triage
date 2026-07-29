import { describe, it, expect } from "vitest";
import {
  averageRanks,
  pearson,
  spearman,
  confidenceInterval95,
  verdictFor,
  seededShuffle,
} from "./stats";

/**
 * These functions decide whether the validation sprint says the ensemble ranks or
 * does not. A silently wrong correlation is worse than no correlation: it produces
 * a confident number that invalidates the experiment without anyone noticing.
 *
 * Every expected value below is hand-computed and shown, so a future change that
 * breaks the maths fails here rather than in a meeting with a radiologist.
 */

describe("averageRanks", () => {
  it("ranks distinct values 1-based in ascending order", () => {
    expect(averageRanks([10, 20, 30])).toEqual([1, 2, 3]);
  });

  it("gives tied values the mean of the ranks they span", () => {
    // two values tie for ranks 1,2 -> 1.5; two tie for 3,4 -> 3.5
    expect(averageRanks([5, 5, 9, 9])).toEqual([1.5, 1.5, 3.5, 3.5]);
  });

  it("preserves input position, not sorted position", () => {
    // values 3,1,3,2 -> sorted 1,2,3,3 -> the two 3s span ranks 3,4 -> 3.5
    expect(averageRanks([3, 1, 3, 2])).toEqual([3.5, 1, 3.5, 2]);
  });

  it("handles every value tied", () => {
    expect(averageRanks([7, 7, 7])).toEqual([2, 2, 2]);
  });
});

describe("pearson", () => {
  it("is 1 for a perfect positive linear relationship", () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10);
  });

  it("is -1 for a perfect negative one", () => {
    expect(pearson([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1, 10);
  });

  it("returns null on zero variance rather than dividing by zero", () => {
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNull();
  });

  it("returns null on mismatched or too-short input", () => {
    expect(pearson([1, 2], [1])).toBeNull();
    expect(pearson([1], [1])).toBeNull();
  });
});

describe("spearman", () => {
  it("is 1 when the orderings agree exactly", () => {
    expect(spearman([1, 2, 3, 4, 5], [1, 2, 3, 4, 5])).toBeCloseTo(1, 10);
  });

  it("is -1 when the orderings are exactly inverted", () => {
    expect(spearman([1, 2, 3, 4, 5], [5, 4, 3, 2, 1])).toBeCloseTo(-1, 10);
  });

  it("matches the hand-computed value for one adjacent swap pair", () => {
    // x ranks [1,2,3,4,5], y=[2,1,4,3,5] ranks [2,1,4,3,5]
    // d = [-1,1,-1,1,0], sum d^2 = 4
    // rho = 1 - 6*4 / (5 * 24) = 1 - 0.2 = 0.8
    expect(spearman([1, 2, 3, 4, 5], [2, 1, 4, 3, 5])).toBeCloseTo(0.8, 10);
  });

  it("matches the hand-computed value for a single displaced element", () => {
    // x ranks [1,2,3,4,5], y=[3,2,3.5,4,5] ranks [2,1,3,4,5]
    // d = [-1,1,0,0,0], sum d^2 = 2
    // rho = 1 - 12/120 = 0.9
    expect(spearman([1, 2, 3, 4, 5], [3, 2, 3.5, 4, 5])).toBeCloseTo(0.9, 10);
  });

  it("is monotonic-correct when one series is heavily tied", () => {
    // This is the real shape: the rater sorts into 3 buckets (many ties) and the
    // model emits a continuous score. Naive ordinal ranking would impose an
    // arbitrary order inside each bucket and skew this.
    const rater = [3, 3, 3, 2, 2, 1, 1];
    const model = [0.9, 0.8, 0.6, 0.5, 0.4, 0.2, 0.1];
    const rho = spearman(rater, model)!;
    expect(rho).toBeGreaterThan(0.9);
    expect(rho).toBeLessThanOrEqual(1);
  });

  it("does not reward a model that inverts a tied rater's buckets", () => {
    const rater = [3, 3, 2, 2, 1, 1];
    const inverted = [0.1, 0.2, 0.5, 0.5, 0.9, 0.95];
    expect(spearman(rater, inverted)!).toBeLessThan(-0.9);
  });

  it("returns null when the rater put everything in one bucket", () => {
    // No signal to correlate against. Must not report 0, which would read as
    // "no agreement" rather than "no data".
    expect(spearman([2, 2, 2, 2], [0.1, 0.4, 0.6, 0.9])).toBeNull();
  });
});

describe("confidenceInterval95", () => {
  it("brackets the point estimate", () => {
    const ci = confidenceInterval95(0.6, 12)!;
    expect(ci[0]).toBeLessThan(0.6);
    expect(ci[1]).toBeGreaterThan(0.6);
  });

  it("is wide at the sample size the sprint actually uses", () => {
    // The headline caveat: at n=20 the interval spans most of the usable range,
    // which is why the sprint is a smoke test and not a validation study.
    const [lo, hi] = confidenceInterval95(0.6, 20)!;
    expect(hi - lo).toBeGreaterThan(0.5);
  });

  it("narrows as n grows", () => {
    const small = confidenceInterval95(0.6, 20)!;
    const large = confidenceInterval95(0.6, 200)!;
    expect(large[1] - large[0]).toBeLessThan(small[1] - small[0]);
  });

  it("returns null where the transform is undefined", () => {
    expect(confidenceInterval95(1, 20)).toBeNull();
    expect(confidenceInterval95(-1, 20)).toBeNull();
    expect(confidenceInterval95(0.5, 3)).toBeNull();
  });
});

describe("verdictFor — pre-registered thresholds", () => {
  it("proceeds at or above 0.6", () => {
    expect(verdictFor(0.6)).toBe("proceed");
    expect(verdictFor(0.95)).toBe("proceed");
  });

  it("treats 0.3 to 0.6 as inconclusive, never as partial success", () => {
    expect(verdictFor(0.3)).toBe("gray");
    expect(verdictFor(0.59)).toBe("gray");
  });

  it("calls it a detector rather than a ranker below 0.3", () => {
    expect(verdictFor(0.29)).toBe("invalid");
    expect(verdictFor(-0.5)).toBe("invalid");
  });

  it("distinguishes no-data from no-agreement", () => {
    expect(verdictFor(null)).toBe("insufficient");
  });

  it("has no gap or overlap at the boundaries", () => {
    // Guards against a future edit turning >= into > and silently creating a
    // band with no verdict.
    for (const v of [0.2999, 0.3, 0.5999, 0.6, 0.6001]) {
      expect(["proceed", "gray", "invalid"]).toContain(verdictFor(v));
    }
  });
});

describe("seededShuffle", () => {
  it("is deterministic for a given seed", () => {
    const a = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], 42);
    const b = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], 42);
    expect(a).toEqual(b);
  });

  it("differs across seeds", () => {
    const a = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], 1);
    const b = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], 2);
    expect(a).not.toEqual(b);
  });

  it("is a permutation, losing and duplicating nothing", () => {
    const input = Array.from({ length: 20 }, (_, i) => i);
    const out = seededShuffle(input, 7);
    expect([...out].sort((x, y) => x - y)).toEqual(input);
  });

  it("does not mutate its input", () => {
    const input = [1, 2, 3, 4, 5];
    seededShuffle(input, 3);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});
