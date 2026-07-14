import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  generateMTTRData,
  generateThroughputData,
  generateOverrideData,
  generateMTTRDataBaseline,
  generateThroughputDataBaseline,
  generateOverrideDataBaseline,
} from "@/lib/mock-data";

export interface AnalyticsData {
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
  // Combined series for charts (withKroix = real/simulated; withoutKroix = baseline mock)
  combinedMTTR:       { date: string; withKroix: number; withoutKroix: number }[];
  combinedThroughput: { date: string; withKroix: number; withoutKroix: number }[];
  combinedOverride:   { date: string; withKroix: number; withoutKroix: number }[];
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

  // Baseline (without-Kroix) from mock generators — stable shape
  const baseMTTR       = generateMTTRDataBaseline();
  const baseThroughput = generateThroughputDataBaseline();
  const baseOverride   = generateOverrideDataBaseline();

  // If no real data yet, show preview mock data as "with-kroix"
  let withMTTR       = slice(raw.mttr);
  let withThroughput = slice(raw.throughput);
  let withOverride   = slice(raw.overrideRate);

  if (!raw.hasRealData) {
    withMTTR       = generateMTTRData().map(d => d.value);
    withThroughput = generateThroughputData().map(d => d.value);
    withOverride   = generateOverrideData().map(d => d.value);
  }

  const combinedMTTR = dates.map((date, i) => ({
    date,
    withKroix:    withMTTR[i]       ?? 0,
    withoutKroix: baseMTTR[i]?.value ?? 0,
  }));
  const combinedThroughput = dates.map((date, i) => ({
    date,
    withKroix:    withThroughput[i]       ?? 0,
    withoutKroix: baseThroughput[i]?.value ?? 0,
  }));
  const combinedOverride = dates.map((date, i) => ({
    date,
    withKroix:    withOverride[i]        ?? 0,
    withoutKroix: baseOverride[i]?.value ?? 0,
  }));

  return {
    hasRealData:      raw.hasRealData,
    dates,
    mttr:             withMTTR,
    throughput:       withThroughput,
    overrideRate:     withOverride,
    feedbackBreak:    slice(raw.feedbackBreak ?? []),
    summary:          raw.summary,
    combinedMTTR,
    combinedThroughput,
    combinedOverride,
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
