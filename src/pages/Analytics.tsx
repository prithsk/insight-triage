import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  generateMTTRData, 
  generateThroughputData, 
  generateOverrideData,
  generateMTTRDataBaseline,
  generateThroughputDataBaseline,
  generateOverrideDataBaseline,
} from "@/lib/mock-data";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";
import { 
  Clock, 
  TrendingUp, 
  RotateCcw, 
  Download,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "with-kroix" | "without-kroix";
type ChartTab = "mttr" | "throughput" | "overrides";

export default function Analytics() {
  const [viewMode, setViewMode] = useState<ViewMode>("with-kroix");
  const [activeTab, setActiveTab] = useState<ChartTab>("mttr");
  
  // With Kroix data
  const mttrData = useMemo(() => generateMTTRData(), []);
  const throughputData = useMemo(() => generateThroughputData(), []);
  const overrideData = useMemo(() => generateOverrideData(), []);
  
  // Without Kroix (baseline) data
  const mttrDataBaseline = useMemo(() => generateMTTRDataBaseline(), []);
  const throughputDataBaseline = useMemo(() => generateThroughputDataBaseline(), []);
  const overrideDataBaseline = useMemo(() => generateOverrideDataBaseline(), []);
  
  // Combine data for overlaid charts
  const combinedMTTR = useMemo(() => {
    return mttrData.map((item, i) => ({
      date: item.date,
      withKroix: item.value,
      withoutKroix: mttrDataBaseline[i].value,
    }));
  }, [mttrData, mttrDataBaseline]);

  const combinedThroughput = useMemo(() => {
    return throughputData.map((item, i) => ({
      date: item.date,
      withKroix: item.value,
      withoutKroix: throughputDataBaseline[i].value,
    }));
  }, [throughputData, throughputDataBaseline]);

  const combinedOverride = useMemo(() => {
    return overrideData.map((item, i) => ({
      date: item.date,
      withKroix: item.value,
      withoutKroix: overrideDataBaseline[i].value,
    }));
  }, [overrideData, overrideDataBaseline]);

  // Select data based on view mode for summary stats
  const activeMTTR = viewMode === "with-kroix" ? mttrData : mttrDataBaseline;
  const activeThroughput = viewMode === "with-kroix" ? throughputData : throughputDataBaseline;
  const activeOverride = viewMode === "with-kroix" ? overrideData : overrideDataBaseline;
  
  // Calculate summary stats
  const avgMTTR = (activeMTTR.reduce((a, b) => a + b.value, 0) / activeMTTR.length).toFixed(2);
  const avgThroughput = Math.round(activeThroughput.reduce((a, b) => a + b.value, 0) / activeThroughput.length);
  const avgOverride = Math.round(activeOverride.reduce((a, b) => a + b.value, 0) / activeOverride.length);
  
  // Trend calculations (compare last vs first)
  const mttrTrend = activeMTTR[activeMTTR.length - 1].value - activeMTTR[0].value;
  const throughputTrend = activeThroughput[activeThroughput.length - 1].value - activeThroughput[0].value;
  
  const isWithKroix = viewMode === "with-kroix";
  
  // CSV export function
  const handleExportCSV = () => {
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0];
    const modeLabel = isWithKroix ? "With_Kroix" : "Without_Kroix";
    
    // Build CSV content with all data
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Header section
    csvContent += `Kroix Analytics Export - ${modeLabel}\n`;
    csvContent += `Generated: ${now.toLocaleString()}\n`;
    csvContent += `\n`;
    
    // Summary statistics
    csvContent += `SUMMARY STATISTICS\n`;
    csvContent += `Metric,Value,Unit\n`;
    csvContent += `Avg. Time to Review (Critical),${avgMTTR},minutes\n`;
    csvContent += `Avg. Throughput,${avgThroughput},scans/hour\n`;
    csvContent += `Override Rate,${avgOverride},%\n`;
    csvContent += `\n`;
    
    // MTTR Data
    csvContent += `MEAN TIME TO REVIEW DATA\n`;
    csvContent += `Date,Value (minutes)\n`;
    activeMTTR.forEach(row => {
      csvContent += `${row.date},${row.value.toFixed(2)}\n`;
    });
    csvContent += `\n`;
    
    // Throughput Data
    csvContent += `THROUGHPUT DATA\n`;
    csvContent += `Date,Value (scans/hour)\n`;
    activeThroughput.forEach(row => {
      csvContent += `${row.date},${row.value}\n`;
    });
    csvContent += `\n`;
    
    // Override Data
    csvContent += `OVERRIDE RATE DATA\n`;
    csvContent += `Date,Value (%)\n`;
    activeOverride.forEach(row => {
      csvContent += `${row.date},${row.value}\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `kroix_analytics_${modeLabel}_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs: { id: ChartTab; label: string }[] = [
    { id: "mttr", label: "Time to Review" },
    { id: "throughput", label: "Throughput" },
    { id: "overrides", label: "Overrides" },
  ];
  
  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-72px)]">
        {/* Page Header */}
        <section className="px-8 py-10 border-b border-[rgba(0,0,0,0.06)]">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-serif text-[40px] lg:text-[48px] leading-[1.1] text-landing-heading tracking-[-0.01em]">
                  Operational <span className="text-landing-primary">Analytics</span>
                </h1>
                <p className="text-[17px] text-landing-body mt-3 max-w-xl">
                  Track workflow improvements and pilot metrics. Compare <em>AI-assisted</em> performance against baseline.
                </p>
              </div>
              
              <button 
                onClick={handleExportCSV}
                className="px-5 py-2.5 bg-landing-primary text-white rounded-[10px] text-[14px] font-medium hover:bg-[#265A4C] transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-4 mt-8">
              <span className="text-[13px] text-landing-muted uppercase tracking-wide">Compare</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setViewMode("with-kroix")}
                  className={cn(
                    "px-4 py-2 rounded-[10px] text-[14px] font-medium transition-colors",
                    viewMode === "with-kroix" 
                      ? "bg-landing-primary text-white" 
                      : "bg-landing-bg text-landing-body hover:bg-landing-primary/15 hover:text-landing-primary"
                  )}
                >
                  With Kroix
                </button>
                <button
                  onClick={() => setViewMode("without-kroix")}
                  className={cn(
                    "px-4 py-2 rounded-[10px] text-[14px] font-medium transition-colors",
                    viewMode === "without-kroix" 
                      ? "bg-landing-muted text-white" 
                      : "bg-landing-bg text-landing-body hover:bg-landing-muted/15 hover:text-landing-muted"
                  )}
                >
                  Without Kroix
                </button>
              </div>
            </div>
          </div>
        </section>
        
        {/* Summary Cards */}
        <section className="px-8 py-8 border-b border-[rgba(0,0,0,0.06)]">
          <div className="max-w-[1600px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* MTTR Card */}
              <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[13px] text-landing-muted">Avg. Time to Review (Critical)</p>
                    <p className="text-[36px] font-serif font-medium text-landing-heading mt-1">{avgMTTR}<span className="text-[20px] text-landing-muted ml-1">min</span></p>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-[13px] font-medium px-2 py-1 rounded-lg",
                    mttrTrend < 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                  )}>
                    {mttrTrend < 0 ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                    {Math.abs(mttrTrend).toFixed(2)}m
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[rgba(0,0,0,0.06)]">
                  <Clock className="w-4 h-4 text-landing-primary" />
                  <span className="text-[13px] text-landing-muted">
                    Mean Time to Review {isWithKroix ? "(AI-assisted)" : "(Manual)"}
                  </span>
                </div>
              </div>
              
              {/* Throughput Card */}
              <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[13px] text-landing-muted">Avg. Throughput</p>
                    <p className="text-[36px] font-serif font-medium text-landing-heading mt-1">{avgThroughput}<span className="text-[20px] text-landing-muted ml-1">scans/hr</span></p>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-[13px] font-medium px-2 py-1 rounded-lg",
                    throughputTrend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                  )}>
                    {throughputTrend > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {Math.abs(throughputTrend)}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[rgba(0,0,0,0.06)]">
                  <TrendingUp className="w-4 h-4 text-landing-primary" />
                  <span className="text-[13px] text-landing-muted">
                    Scans per hour {isWithKroix ? "(AI-assisted)" : "(Manual)"}
                  </span>
                </div>
              </div>
              
              {/* Override Rate Card */}
              <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[13px] text-landing-muted">Override Rate</p>
                    <p className="text-[36px] font-serif font-medium text-landing-heading mt-1">{avgOverride}<span className="text-[20px] text-landing-muted ml-1">%</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[rgba(0,0,0,0.06)]">
                  <RotateCcw className="w-4 h-4 text-landing-primary" />
                  <span className="text-[13px] text-landing-muted">
                    Priority corrections {isWithKroix ? "(AI-assisted)" : "(Manual re-queue)"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Charts Section */}
        <section className="px-8 py-8">
          <div className="max-w-[1600px] mx-auto">
            {/* Chart Tabs */}
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
            
            {/* Chart Container */}
            <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-serif text-[18px] text-landing-heading">
                  {activeTab === "mttr" && "Mean Time to Review (Critical Bucket)"}
                  {activeTab === "throughput" && "Scans Reviewed per Hour"}
                  {activeTab === "overrides" && "Priority Override Rate"}
                  <span className="text-[14px] text-landing-muted font-sans ml-2">— Last 7 Days</span>
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#2F6F5E]" />
                    <span className="text-[12px] text-landing-body">With Kroix</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#9CA3AF]" />
                    <span className="text-[12px] text-landing-body">Without Kroix</span>
                  </div>
                </div>
              </div>
              
              <div className="h-[400px]">
                {activeTab === "mttr" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={combinedMTTR}>
                      <defs>
                        <linearGradient id="mttrGradientWith" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2F6F5E" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#2F6F5E" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="mttrGradientWithout" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#9CA3AF" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9CA3AF"
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="#9CA3AF"
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        unit="m"
                        domain={[0, 10]}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid rgba(0,0,0,0.06)',
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        }}
                        labelStyle={{ color: '#1F2937', fontWeight: 500 }}
                        formatter={(value: number, name: string) => [
                          `${value.toFixed(2)}m`,
                          name === 'withKroix' ? 'With Kroix' : 'Without Kroix'
                        ]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="withoutKroix" 
                        stroke="#9CA3AF" 
                        fill="url(#mttrGradientWithout)"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="withKroix" 
                        stroke="#2F6F5E" 
                        fill="url(#mttrGradientWith)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
                
                {activeTab === "throughput" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={combinedThroughput}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9CA3AF"
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="#9CA3AF"
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        domain={[0, 45]}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid rgba(0,0,0,0.06)',
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        }}
                        labelStyle={{ color: '#1F2937', fontWeight: 500 }}
                        formatter={(value: number, name: string) => [
                          `${value} scans/hr`,
                          name === 'withKroix' ? 'With Kroix' : 'Without Kroix'
                        ]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="withoutKroix" 
                        stroke="#9CA3AF" 
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={{ fill: '#9CA3AF', strokeWidth: 0 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="withKroix" 
                        stroke="#2F6F5E" 
                        strokeWidth={2}
                        dot={{ fill: '#2F6F5E', strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
                
                {activeTab === "overrides" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={combinedOverride}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9CA3AF"
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="#9CA3AF"
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        unit="%"
                        domain={[0, 40]}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid rgba(0,0,0,0.06)',
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        }}
                        labelStyle={{ color: '#1F2937', fontWeight: 500 }}
                        formatter={(value: number, name: string) => [
                          `${value}%`,
                          name === 'withKroix' ? 'With Kroix' : 'Without Kroix'
                        ]}
                      />
                      <Bar 
                        dataKey="withoutKroix" 
                        fill="#D1D5DB" 
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar 
                        dataKey="withKroix" 
                        fill="#2F6F5E" 
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
