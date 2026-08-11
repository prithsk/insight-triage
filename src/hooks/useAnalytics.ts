import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Analytics for the authenticated app.
 *
 * NO SYNTHETIC COMPARISON ARM. This hook used to build a "without Kroix"
 * baseline from `@/lib/mock-data` generators on EVERY render — including when
 * `hasRealData` was true — and `Analytics.tsx` charted it against the real
 * series and exported both to CSV. A logged-in partner therefore saw, and could
 * download, a head-to-head against an arm that was invented.
 *
 * There is no counterfactual. Measuring what these numbers would have been
 * without Kroix requires the department's historical worklist and the SLA replay
 * (`src/validation/slaReplay.ts`) — which is the entire reason that harness
 * exists. A mock generator cannot stand in for it.
 *
 * So this hook now returns only what was actually measured, plus `hasRealData`
 * so the UI can say "no data yet" instead of drawing a plausible line. If a
 * comparison is ever added back, it must come from a replay over real historical
 * data, be labelled with its method, and never be synthesised client-side.
 */

export interface AnalyticsData {
  /** False until real studies have been reviewed. The UI must show an empty state, not mock data. */
  hasRealData: boolean;
  dates: string[];
  mttr: number[];
  throughput: number[];
  overrideRate: number[];
  feedbackBreak: { correct: number; falseAlarm: number; missed: number }[];
  summary: {
    totalStudies: number;
    totalReviewed: number;
    totalFeedback: number;
    correctRate: number;
    falseAlarmRate: number;
    missedRate: number;
    overrideRate: number;
  };
  /** Measured series only. There is deliberately no `withoutKroix` field. */
  series: {
    mttr:       { date: string; value: number }[];
    throughput: { date: string; value: number }[];
    override:   { date: string; value: number }[];
  };
}

async function fetchAnalytics(): Promise<AnalyticsData> {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics-aggregate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
    }
  );

  if (!res.ok) throw new Error("Analytics fetch failed");
  const raw = await res.json();

  // Use last-7-days slice for charts (more readable)
  const slice = (arr: number[]) => arr.slice(-7);
  const sliceAny = <T,>(arr: T[]) => arr.slice(-7);
  const sliceD = (arr: string[]) =>
    arr.slice(-7).map(d => {
      const dt = new Date(d);
      return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });

  const dates = sliceD(raw.dates);

  // Measured series only. When hasRealData is false these are empty rather than
  // filled from mock generators — an empty chart is honest, a plausible one is not.
  const mttr       = slice(raw.mttr);
  const throughput = slice(raw.throughput);
  const overrideRate = slice(raw.overrideRate);

  const zip = (values: number[]) =>
    dates.map((date, i) => ({ date, value: values[i] ?? 0 }));

  return {
    hasRealData:      raw.hasRealData,
    dates,
    mttr,
    throughput,
    overrideRate,
    feedbackBreak:    sliceAny(raw.feedbackBreak ?? []),
    summary:          raw.summary,
    series: {
      mttr:       zip(mttr),
      throughput: zip(throughput),
      override:   zip(overrideRate),
    },
  };
}

export function useAnalytics() {
  return useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn:  fetchAnalytics,
    staleTime: 2 * 60 * 1000,   // refresh every 2 min
    retry: 1,
  });
}
