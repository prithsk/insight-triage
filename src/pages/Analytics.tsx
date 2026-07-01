import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell,
} from "recharts";
import {
  Clock, TrendingUp, RotateCcw, Download, ArrowUpRight,
  ArrowDownRight, BarChart3, CheckCircle2, AlertTriangle,
  AlertCircle, Loader2, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "with-kroix" | "without-kroix";
type ChartTab = "mttr" | "throughput" | "overrides" | "feedback";

const CHART_TEAL   = "#2F6F5E";
const CHART_GREY   = "#9CA3AF";
const CHART_GREEN  = "#10B981";
const CHART_AMBER  = "#F59E0B";
const CHART_RED    = "#EF4444";

const TOOLTIP_STYLE = {
  backgroundColor: "white",
  border: "1px solid rgba(0,0,0,0.06)",
  borderRadius: "12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

export default function Analytics() {
  const [viewMode,   setViewMode]   = useState<ViewMode>("with-kroix");
  const [activeTab,  setActiveTab]  = useState<ChartTab>("mttr");

  const { data, isLoading, error } = useAnalytics();

  const isWithKroix = viewMode === "with-kroix";

  // ── Summary stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!data) return null;
    const mttr       = isWithKroix ? data.combinedMTTR.map(d => d.withKroix)       : data.combinedMTTR.map(d => d.withoutKroix);
    const throughput = isWithKroix ? data.combinedThroughput.map(d => d.withKroix) : data.combinedThroughput.map(d => d.withoutKroix);
    const override   = isWithKroix ? data.combinedOverride.map(d => d.withKroix)   : data.combinedOverride.map(d => d.withoutKroix);
    const avg = (arr: number[]) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
    return {
      avgMTTR:       avg(mttr).toFixed(1),
      avgThroughput: Math.round(avg(throughput)),
      avgOverride:   Math.round(avg(override)),
      mttrTrend:     mttr.length > 1 ? mttr[mttr.length-1] - mttr[0] : 0,
      tpTrend:       throughput.length > 1 ? throughput[throughput.length-1] - throughput[0] : 0,
    };
  }, [data, isWithKroix]);

  // ── Feedback donut data ───────────────────────────────────────────────────
  const feedbackPie = useMemo(() => {
    if (!data?.summary) return [];
    const s = data.summary;
    return [
      { name: "Correct",      value: s.correctRate,   color: CHART_GREEN },
      { name: "False Alarm",  value: s.falseAlarmRate, color: CHART_AMBER },
      { name: "Missed",       value: s.missedRate,    color: CHART_RED   },
    ].filter(d => d.value > 0);
  }, [data]);

  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!data) return;
    const ts = new Date().toISOString().split("T")[0];
    const mode = isWithKroix ? "With_Kroix" : "Without_Kroix";
    let csv = `Kroix Analytics Export - ${mode}\nGenerated: ${new Date().toLocaleString()}\n\n`;
    csv += `MTTR DATA\nDate,Value (min)\n`;
    data.combinedMTTR.forEach(r => { csv += `${r.date},${isWithKroix ? r.withKroix : r.withoutKroix}\n`; });
    csv += `\nTHROUGHPUT DATA\nDate,Value (scans/hr)\n`;
    data.combinedThroughput.forEach(r => { csv += `${r.date},${isWithKroix ? r.withKroix : r.withoutKroix}\n`; });
    csv += `\nFEEDBACK SUMMARY\nMetric,Value\n`;
    if (data.summary) {
      const s = data.summary;
      csv += `Total Studies,${s.totalStudies}\nTotal Reviewed,${s.totalReviewed}\n`;
      csv += `Correct Priority,${s.correctRate}%\nFalse Alarm Rate,${s.falseAlarmRate}%\nMissed Urgency,${s.missedRate}%\n`;
    }
    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    link.download = `kroix_analytics_${mode}_${ts}.csv`;
    link.click();
  };

  const tabs: { id: ChartTab; label: string }[] = [
    { id: "mttr",      label: "Time to Review"     },
    { id: "throughput",label: "Throughput"          },
    { id: "overrides", label: "Override Rate"       },
    { id: "feedback",  label: "Feedback Quality"    },
  ];

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-72px)]">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <section className="px-8 py-10 border-b border-[rgba(0,0,0,0.06)] bg-white/40 backdrop-blur-sm">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-serif text-[40px] lg:text-[48px] leading-[1.1] text-landing-heading tracking-[-0.01em]">
                  Operational <span className="text-landing-primary">Analytics</span>
                </h1>
                <p className="text-[17px] text-landing-body mt-3 max-w-xl">
                  Track workflow improvements and pilot metrics. Compare{" "}
                  <em>AI-assisted</em> performance against baseline.
                </p>
              </div>
              <button
                onClick={handleExportCSV}
                disabled={isLoading || !data}
                className="px-5 py-2.5 bg-landing-primary text-white rounded-[10px] text-[14px] font-medium hover:bg-[#265A4C] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            {/* Preview banner when no real data yet */}
            {data && !data.hasRealData && (
              <div className="mt-6 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-[10px]">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[13px] text-amber-800">
                  <strong>Preview data shown.</strong> Upload and review studies to see your real analytics. Charts will update automatically.
                </p>
              </div>
            )}

            {/* View mode toggle */}
            <div className="flex items-center gap-4 mt-6">
              <span className="text-[13px] text-landing-muted uppercase tracking-wide">Compare</span>
              <div className="flex gap-1">
                {[
                  { id: "with-kroix",    label: "With Kroix"    },
                  { id: "without-kroix", label: "Without Kroix" },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setViewMode(m.id as ViewMode)}
                    className={cn(
                      "px-4 py-2 rounded-[10px] text-[14px] font-medium transition-colors",
                      viewMode === m.id
                        ? m.id === "with-kroix" ? "bg-landing-primary text-white" : "bg-landing-muted text-white"
                        : "bg-landing-bg text-landing-body hover:bg-landing-primary/15 hover:text-landing-primary"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Loading state ─────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-landing-primary" />
          </div>
        )}

        {error && (
          <div className="px-8 py-12 text-center">
            <p className="text-landing-muted">Failed to load analytics. Please try again.</p>
          </div>
        )}

        {data && !isLoading && (
          <>
            {/* ── Summary Cards ──────────────────────────────────────────────── */}
            <section className="px-8 py-8 border-b border-[rgba(0,0,0,0.06)]">
              <div className="max-w-[1600px] mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">

                  {/* MTTR */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[rgba(0,0,0,0.06)] p-6 shadow-sm">
                    <p className="text-[13px] text-landing-muted">Avg. Time to Review</p>
                    <p className="text-[36px] font-serif font-medium text-landing-heading mt-1">
                      {stats?.avgMTTR}<span className="text-[20px] text-landing-muted ml-1">min</span>
                    </p>
                    {stats && stats.mttrTrend !== 0 && (
                      <div className={cn(
                        "inline-flex items-center gap-1 text-[13px] font-medium px-2 py-1 rounded-lg mt-2",
                        stats.mttrTrend < 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                      )}>
                        {stats.mttrTrend < 0 ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                        {Math.abs(stats.mttrTrend).toFixed(1)}m
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[rgba(0,0,0,0.06)]">
                      <Clock className="w-4 h-4 text-landing-primary" />
                      <span className="text-[13px] text-landing-muted">Mean time to review (critical)</span>
                    </div>
                  </div>

                  {/* Throughput */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[rgba(0,0,0,0.06)] p-6 shadow-sm">
                    <p className="text-[13px] text-landing-muted">Avg. Throughput</p>
                    <p className="text-[36px] font-serif font-medium text-landing-heading mt-1">
                      {stats?.avgThroughput}<span className="text-[20px] text-landing-muted ml-1">scans/hr</span>
                    </p>
                    {stats && stats.tpTrend !== 0 && (
                      <div className={cn(
                        "inline-flex items-center gap-1 text-[13px] font-medium px-2 py-1 rounded-lg mt-2",
                        stats.tpTrend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                      )}>
                        {stats.tpTrend > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {Math.abs(stats.tpTrend).toFixed(0)}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[rgba(0,0,0,0.06)]">
                      <TrendingUp className="w-4 h-4 text-landing-primary" />
                      <span className="text-[13px] text-landing-muted">Scans reviewed per hour</span>
                    </div>
                  </div>

                  {/* Override rate */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[rgba(0,0,0,0.06)] p-6 shadow-sm">
                    <p className="text-[13px] text-landing-muted">Override Rate</p>
                    <p className="text-[36px] font-serif font-medium text-landing-heading mt-1">
                      {stats?.avgOverride}<span className="text-[20px] text-landing-muted ml-1">%</span>
                    </p>
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[rgba(0,0,0,0.06)]">
                      <RotateCcw className="w-4 h-4 text-landing-primary" />
                      <span className="text-[13px] text-landing-muted">Priority corrections by radiologists</span>
                    </div>
                  </div>

                  {/* Feedback quality (real data only, else preview) */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[rgba(0,0,0,0.06)] p-6 shadow-sm">
                    <p className="text-[13px] text-landing-muted">Feedback Quality</p>
                    {data.summary.totalFeedback > 0 ? (
                      <>
                        <p className="text-[36px] font-serif font-medium text-emerald-600 mt-1">
                          {data.summary.correctRate}<span className="text-[20px] text-landing-muted ml-1">%</span>
                        </p>
                        <div className="flex flex-col gap-1.5 mt-4 pt-4 border-t border-[rgba(0,0,0,0.06)]">
                          {[
                            { label: "Correct",     val: data.summary.correctRate,   color: "bg-emerald-500", icon: CheckCircle2, cls: "text-emerald-600" },
                            { label: "False Alarm", val: data.summary.falseAlarmRate, color: "bg-amber-500",   icon: AlertTriangle, cls: "text-amber-600" },
                            { label: "Missed",      val: data.summary.missedRate,    color: "bg-red-500",     icon: AlertCircle,  cls: "text-red-600"   },
                          ].map(f => {
                            const Icon = f.icon;
                            return (
                              <div key={f.label} className="flex items-center gap-2">
                                <Icon className={cn("w-3 h-3", f.cls)} />
                                <span className="text-[12px] text-landing-muted w-20">{f.label}</span>
                                <div className="flex-1 h-1.5 bg-landing-bg rounded-full overflow-hidden">
                                  <div className={cn("h-full rounded-full", f.color)} style={{ width: `${f.val}%` }} />
                                </div>
                                <span className="text-[11px] font-mono text-landing-body">{f.val}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="mt-3">
                        <p className="text-[28px] font-serif text-landing-muted">—</p>
                        <p className="text-[13px] text-landing-muted mt-4 pt-4 border-t border-[rgba(0,0,0,0.06)]">
                          Submit feedback in Reviewer to populate this metric.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* ── Charts ───────────────────────────────────────────────────────── */}
            <section className="px-8 py-8">
              <div className="max-w-[1600px] mx-auto">
                {/* Tabs */}
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="w-4 h-4 text-landing-muted" />
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "px-4 py-2 rounded-[10px] text-[14px] font-medium transition-colors",
                        activeTab === tab.id
                          ? "bg-landing-primary text-white"
                          : "bg-landing-bg text-landing-body hover:bg-landing-primary/15 hover:text-landing-primary"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Chart card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[rgba(0,0,0,0.06)] p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-serif text-[18px] text-landing-heading">
                      {activeTab === "mttr"      && "Mean Time to Review (Critical Bucket)"}
                      {activeTab === "throughput" && "Scans Reviewed per Hour"}
                      {activeTab === "overrides"  && "Priority Override Rate"}
                      {activeTab === "feedback"   && "Daily Feedback Breakdown"}
                      <span className="text-[14px] text-landing-muted font-sans ml-2">— Last 7 Days</span>
                    </h3>
                    {activeTab !== "feedback" && (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#2F6F5E]" /><span className="text-[12px] text-landing-body">With Kroix</span></div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#9CA3AF]" /><span className="text-[12px] text-landing-body">Without Kroix</span></div>
                      </div>
                    )}
                  </div>

                  <div className="h-[380px]">
                    {/* MTTR */}
                    {activeTab === "mttr" && (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.combinedMTTR}>
                          <defs>
                            <linearGradient id="gWith"    x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CHART_TEAL} stopOpacity={0.18}/><stop offset="95%" stopColor={CHART_TEAL} stopOpacity={0}/></linearGradient>
                            <linearGradient id="gWithout" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CHART_GREY} stopOpacity={0.12}/><stop offset="95%" stopColor={CHART_GREY} stopOpacity={0}/></linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                          <XAxis dataKey="date" stroke={CHART_GREY} tick={{ fill:"#6B7280", fontSize:12 }} />
                          <YAxis stroke={CHART_GREY} tick={{ fill:"#6B7280", fontSize:12 }} unit="m" />
                          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, n: string) => [`${v.toFixed(1)}m`, n === "withKroix" ? "With Kroix" : "Without Kroix"]} />
                          <Area type="monotone" dataKey="withoutKroix" stroke={CHART_GREY}  fill="url(#gWithout)" strokeWidth={2} strokeDasharray="4 4" />
                          <Area type="monotone" dataKey="withKroix"    stroke={CHART_TEAL}  fill="url(#gWith)"    strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}

                    {/* Throughput */}
                    {activeTab === "throughput" && (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.combinedThroughput}>
                          <defs>
                            <linearGradient id="gTpWith"    x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CHART_TEAL} stopOpacity={0.18}/><stop offset="95%" stopColor={CHART_TEAL} stopOpacity={0}/></linearGradient>
                            <linearGradient id="gTpWithout" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CHART_GREY} stopOpacity={0.12}/><stop offset="95%" stopColor={CHART_GREY} stopOpacity={0}/></linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                          <XAxis dataKey="date" stroke={CHART_GREY} tick={{ fill:"#6B7280", fontSize:12 }} />
                          <YAxis stroke={CHART_GREY} tick={{ fill:"#6B7280", fontSize:12 }} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, n: string) => [`${v} scans/hr`, n === "withKroix" ? "With Kroix" : "Without Kroix"]} />
                          <Area type="monotone" dataKey="withoutKroix" stroke={CHART_GREY} fill="url(#gTpWithout)" strokeWidth={2} strokeDasharray="4 4" />
                          <Area type="monotone" dataKey="withKroix"    stroke={CHART_TEAL} fill="url(#gTpWith)"    strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}

                    {/* Override rate */}
                    {activeTab === "overrides" && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.combinedOverride}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                          <XAxis dataKey="date" stroke={CHART_GREY} tick={{ fill:"#6B7280", fontSize:12 }} />
                          <YAxis stroke={CHART_GREY} tick={{ fill:"#6B7280", fontSize:12 }} unit="%" />
                          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, n: string) => [`${v}%`, n === "withKroix" ? "With Kroix" : "Without Kroix"]} />
                          <Bar dataKey="withoutKroix" fill="#D1D5DB" radius={[5,5,0,0]} />
                          <Bar dataKey="withKroix"    fill={CHART_TEAL} radius={[5,5,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}

                    {/* Feedback breakdown */}
                    {activeTab === "feedback" && (
                      data.summary.totalFeedback > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data.feedbackBreak.map((d, i) => ({ ...d, date: data.dates[i] }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                            <XAxis dataKey="date" stroke={CHART_GREY} tick={{ fill:"#6B7280", fontSize:11 }} />
                            <YAxis stroke={CHART_GREY} tick={{ fill:"#6B7280", fontSize:12 }} allowDecimals={false} />
                            <Tooltip contentStyle={TOOLTIP_STYLE} />
                            <Bar dataKey="correct"   fill={CHART_GREEN} radius={[4,4,0,0]} name="Correct Priority" />
                            <Bar dataKey="falseAlarm" fill={CHART_AMBER} radius={[4,4,0,0]} name="False Alarm" />
                            <Bar dataKey="missed"    fill={CHART_RED}   radius={[4,4,0,0]} name="Missed Urgency" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-landing-muted">
                          <CheckCircle2 className="w-12 h-12 opacity-30" />
                          <p className="text-[15px]">No feedback data yet.</p>
                          <p className="text-[13px]">Open the Reviewer and submit feedback on triaged studies.</p>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Real data stats footer */}
                {data.hasRealData && data.summary.totalStudies > 0 && (
                  <div className="mt-4 flex items-center gap-6 text-[13px] text-landing-muted">
                    <span>{data.summary.totalStudies} studies tracked</span>
                    <span className="w-1 h-1 rounded-full bg-landing-muted" />
                    <span>{data.summary.totalReviewed} reviewed</span>
                    <span className="w-1 h-1 rounded-full bg-landing-muted" />
                    <span>{data.summary.totalFeedback} feedback events</span>
                    <span className="w-1 h-1 rounded-full bg-landing-muted" />
                    <span className="text-emerald-600 font-medium">Live data</span>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
