/**
 * Rank statistics for the validation sprint.
 *
 * Tie handling matters here and is easy to get wrong. The rater sorts into three
 * urgency buckets, so their ordering carries large groups of tied values. Naive
 * ordinal ranking would impose an arbitrary order inside each bucket and inflate or
 * deflate the correlation depending on how the array happened to be sorted. Every
 * function below uses average ("fractional") ranks.
 */

/** Average ranks, 1-based. Tied values share the mean of the ranks they span. */
export function averageRanks(values: number[]): number[] {
  const order = values
    .map((v, i) => ({ v, i }))
    .sort((a, b) => a.v - b.v);

  const ranks = new Array<number>(values.length);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1].v === order[i].v) j++;
    // ranks are 1-based: positions i..j inclusive
    const mean = (i + j + 2) / 2;
    for (let k = i; k <= j; k++) ranks[order[k].i] = mean;
    i = j + 1;
  }
  return ranks;
}

/** Pearson correlation. Returns null when either series has zero variance. */
export function pearson(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length < 2) return null;
  const n = a.length;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;

  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  if (da === 0 || db === 0) return null;
  return num / Math.sqrt(da * db);
}

/**
 * Spearman rho = Pearson correlation of average ranks.
 * Null when a series is constant (e.g. the rater put everything in one bucket).
 */
export function spearman(a: number[], b: number[]): number | null {
  return pearson(averageRanks(a), averageRanks(b));
}

/**
 * Fisher z 95% confidence interval for a correlation at sample size n.
 *
 * Reported because at n=20 the interval is roughly ±0.4, which is the single most
 * important caveat on this whole exercise: the sprint detects the extremes and
 * cannot resolve the middle. Showing rho without the interval overstates it.
 */
export function confidenceInterval95(rho: number, n: number): [number, number] | null {
  if (n < 4 || Math.abs(rho) >= 1) return null;
  const z = 0.5 * Math.log((1 + rho) / (1 - rho));
  const se = 1 / Math.sqrt(n - 3);
  const lo = z - 1.96 * se;
  const hi = z + 1.96 * se;
  const back = (v: number) => (Math.exp(2 * v) - 1) / (Math.exp(2 * v) + 1);
  return [back(lo), back(hi)];
}

export type Verdict = "proceed" | "gray" | "invalid" | "insufficient";

/** Pre-registered thresholds. Fixed before results are seen, on purpose. */
export function verdictFor(rho: number | null): Verdict {
  if (rho === null) return "insufficient";
  if (rho >= 0.6) return "proceed";
  if (rho >= 0.3) return "gray";
  return "invalid";
}

export const VERDICT_COPY: Record<Verdict, { label: string; detail: string; tone: string }> = {
  proceed: {
    label: "Ranks with the radiologist",
    detail:
      "At or above the pre-registered 0.6 bar. The ensemble orders the medium band in a way that tracks clinical judgment. Proceed to repositioning.",
    tone: "text-kx-accent3",
  },
  gray: {
    label: "Inconclusive",
    detail:
      "Between 0.3 and 0.6. This is the gray zone, and the pre-registered rule is explicit: retune ranking and re-run. This is not partial success and must not be reported as one.",
    tone: "text-amber-500",
  },
  invalid: {
    label: "Detector, not a ranker",
    detail:
      "Below 0.3. The ensemble does not order the ambiguous middle in a way that matches clinical judgment. The medium-band product is invalid as currently built.",
    tone: "text-kx-critical",
  },
  insufficient: {
    label: "Not enough signal",
    detail:
      "Correlation is undefined, usually because every study landed in one bucket. Re-run with a spread.",
    tone: "text-kx-muted",
  },
};

/** Deterministic PRNG so a session's randomised order is stable across re-renders. */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed;
  const next = () => {
    // mulberry32
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
