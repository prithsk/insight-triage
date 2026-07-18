import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireApprovedUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireApprovedUser(req);
    if ("error" in auth) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl  = Deno.env.get("SUPABASE_URL")!;
    const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, serviceKey);

    const days = 30;
    const end   = new Date();
    const start = new Date(end.getTime() - days * 86400_000);

    const [{ data: studies }, { data: feedback }, { data: triage }] = await Promise.all([
      db.from("studies")
        .select("id, created_at, updated_at, status")
        .gte("created_at", start.toISOString()),
      db.from("feedback_events")
        .select("study_id, feedback_type, created_at")
        .gte("created_at", start.toISOString()),
      db.from("triage_results")
        .select("study_id, risk_bucket, created_at")
        .gte("created_at", start.toISOString()),
    ]);

    type Day = {
      total: number; reviewed: number;
      mttrSum: number; mttrN: number;
      correct: number; falseAlarm: number; missed: number;
      critical: number;
    };

    const map = new Map<string, Day>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime() + i * 86400_000);
      map.set(d.toISOString().slice(0, 10), {
        total:0, reviewed:0, mttrSum:0, mttrN:0,
        correct:0, falseAlarm:0, missed:0, critical:0,
      });
    }

    for (const s of (studies ?? [])) {
      const key = s.created_at.slice(0, 10);
      const day = map.get(key); if (!day) continue;
      day.total++;
      if (s.status === "REVIEWED") {
        day.reviewed++;
        const mttr = (new Date(s.updated_at).getTime() - new Date(s.created_at).getTime()) / 60_000;
        if (mttr > 0 && mttr < 1440) { day.mttrSum += mttr; day.mttrN++; }
      }
    }

    for (const f of (feedback ?? [])) {
      const key = f.created_at.slice(0, 10);
      const day = map.get(key); if (!day) continue;
      if (f.feedback_type === "CORRECT_PRIORITY") day.correct++;
      if (f.feedback_type === "FALSE_ALARM")      day.falseAlarm++;
      if (f.feedback_type === "MISSED_URGENCY")   day.missed++;
    }

    for (const t of (triage ?? [])) {
      const key = t.created_at.slice(0, 10);
      const day = map.get(key); if (!day) continue;
      if (t.risk_bucket === "CRITICAL") day.critical++;
    }

    const dates: string[] = [];
    const mttr: number[] = [];
    const throughput: number[] = [];
    const overrideRate: number[] = [];
    const feedbackBreak: { correct: number; falseAlarm: number; missed: number }[] = [];

    let totStudies=0, totReviewed=0, totFeedback=0,
        totCorrect=0, totFalse=0, totMissed=0;

    for (const [date, d] of map) {
      dates.push(date);
      mttr.push(d.mttrN > 0 ? Math.round((d.mttrSum / d.mttrN) * 10) / 10 : 0);
      throughput.push(d.reviewed > 0 ? Math.round(d.reviewed / 8 * 10) / 10 : 0);
      const fb = d.correct + d.falseAlarm + d.missed;
      overrideRate.push(fb > 0 ? Math.round((d.falseAlarm + d.missed) / fb * 100) : 0);
      feedbackBreak.push({ correct: d.correct, falseAlarm: d.falseAlarm, missed: d.missed });
      totStudies  += d.total; totReviewed += d.reviewed;
      totCorrect  += d.correct; totFalse += d.falseAlarm; totMissed += d.missed;
      totFeedback += fb;
    }

    return new Response(JSON.stringify({
      hasRealData: totStudies > 0 || totFeedback > 0,
      dates,
      mttr,
      throughput,
      overrideRate,
      feedbackBreak,
      summary: {
        totalStudies: totStudies,
        totalReviewed: totReviewed,
        totalFeedback: totFeedback,
        correctRate:   totFeedback > 0 ? Math.round(totCorrect  / totFeedback * 100) : 0,
        falseAlarmRate: totFeedback > 0 ? Math.round(totFalse   / totFeedback * 100) : 0,
        missedRate:    totFeedback > 0 ? Math.round(totMissed   / totFeedback * 100) : 0,
        overrideRate:  totFeedback > 0 ? Math.round((totFalse+totMissed) / totFeedback * 100) : 0,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("analytics-aggregate error:", err);
    return new Response(JSON.stringify({ error: "Aggregation failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
