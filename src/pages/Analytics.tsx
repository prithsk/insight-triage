import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";

type ViewMode = "with-kroix" | "without-kroix";

export default function Analytics() {
  const [viewMode, setViewMode] = useState<ViewMode>("with-kroix");
  
  // With Kroix data
  const mttrData = useMemo(() => generateMTTRData(), []);
  const throughputData = useMemo(() => generateThroughputData(), []);
  const overrideData = useMemo(() => generateOverrideData(), []);
  
  // Without Kroix (baseline) data
  const mttrDataBaseline = useMemo(() => generateMTTRDataBaseline(), []);
  const throughputDataBaseline = useMemo(() => generateThroughputDataBaseline(), []);
  const overrideDataBaseline = useMemo(() => generateOverrideDataBaseline(), []);
  
  // Select data based on view mode
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
  
  return (
    <AppLayout>
      <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
        {/* Page Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div>
            <h1 className="text-xl font-semibold">Operational Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Track workflow improvements and pilot metrics
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode("with-kroix")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "with-kroix"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                With Kroix
              </button>
              <button
                onClick={() => setViewMode("without-kroix")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "without-kroix"
                    ? "bg-muted-foreground/20 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Without Kroix
              </button>
            </div>
            
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 p-6">
          <Card className="bg-surface border-border">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Time to Review (Critical)</p>
                  <p className="text-3xl font-bold font-mono mt-1">{avgMTTR}m</p>
                </div>
                <div className={`flex items-center gap-1 text-sm ${mttrTrend < 0 ? 'text-clear' : 'text-critical'}`}>
                  {mttrTrend < 0 ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  {Math.abs(mttrTrend).toFixed(2)}m
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">
                  Mean Time to Review {isWithKroix ? "(AI-assisted)" : "(Manual)"}
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-surface border-border">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Throughput</p>
                  <p className="text-3xl font-bold font-mono mt-1">{avgThroughput}</p>
                </div>
                <div className={`flex items-center gap-1 text-sm ${throughputTrend > 0 ? 'text-clear' : 'text-critical'}`}>
                  {throughputTrend > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {Math.abs(throughputTrend)}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">
                  Scans per hour {isWithKroix ? "(AI-assisted)" : "(Manual)"}
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-surface border-border">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Override Rate</p>
                  <p className="text-3xl font-bold font-mono mt-1">{avgOverride}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <RotateCcw className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">
                  Priority corrections {isWithKroix ? "(AI-assisted)" : "(Manual re-queue)"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Charts */}
        <div className="flex-1 px-6 pb-6 min-h-0 overflow-hidden">
          <Tabs defaultValue="mttr" className="h-full flex flex-col">
            <TabsList className="grid w-full max-w-md grid-cols-3 bg-muted flex-shrink-0">
              <TabsTrigger value="mttr">Time to Review</TabsTrigger>
              <TabsTrigger value="throughput">Throughput</TabsTrigger>
              <TabsTrigger value="overrides">Overrides</TabsTrigger>
            </TabsList>
            
            <TabsContent value="mttr" className="flex-1 mt-4 min-h-0">
              <Card className="h-full bg-surface border-border flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <CardTitle className="text-sm font-medium">
                    Mean Time to Review (Critical Bucket) - Last 7 Days 
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${isWithKroix ? 'bg-primary/20 text-primary' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                      {isWithKroix ? "With Kroix" : "Without Kroix"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activeMTTR}>
                      <defs>
                        <linearGradient id="mttrGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={isWithKroix ? "hsl(217, 91%, 60%)" : "hsl(0, 60%, 50%)"} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={isWithKroix ? "hsl(217, 91%, 60%)" : "hsl(0, 60%, 50%)"} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 25%, 20%)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(218, 15%, 65%)"
                        tick={{ fill: 'hsl(218, 15%, 65%)', fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="hsl(218, 15%, 65%)"
                        tick={{ fill: 'hsl(218, 15%, 65%)', fontSize: 12 }}
                        unit="m"
                        domain={isWithKroix ? [0, 4] : [0, 10]}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(220, 30%, 10%)', 
                          border: '1px solid hsl(220, 25%, 20%)',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: 'hsl(216, 33%, 93%)' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke={isWithKroix ? "hsl(217, 91%, 60%)" : "hsl(0, 60%, 50%)"} 
                        fill="url(#mttrGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="throughput" className="flex-1 mt-4 min-h-0">
              <Card className="h-full bg-surface border-border flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <CardTitle className="text-sm font-medium">
                    Scans Reviewed per Hour - Last 7 Days
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${isWithKroix ? 'bg-primary/20 text-primary' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                      {isWithKroix ? "With Kroix" : "Without Kroix"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activeThroughput}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 25%, 20%)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(218, 15%, 65%)"
                        tick={{ fill: 'hsl(218, 15%, 65%)', fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="hsl(218, 15%, 65%)"
                        tick={{ fill: 'hsl(218, 15%, 65%)', fontSize: 12 }}
                        domain={isWithKroix ? [20, 40] : [0, 20]}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(220, 30%, 10%)', 
                          border: '1px solid hsl(220, 25%, 20%)',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: 'hsl(216, 33%, 93%)' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={isWithKroix ? "hsl(142, 71%, 45%)" : "hsl(32, 95%, 50%)"} 
                        strokeWidth={2}
                        dot={{ fill: isWithKroix ? 'hsl(142, 71%, 45%)' : 'hsl(32, 95%, 50%)' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="overrides" className="flex-1 mt-4 min-h-0">
              <Card className="h-full bg-surface border-border flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <CardTitle className="text-sm font-medium">
                    Priority Override Rate (%) - Last 7 Days
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${isWithKroix ? 'bg-primary/20 text-primary' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                      {isWithKroix ? "With Kroix" : "Without Kroix"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activeOverride}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 25%, 20%)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(218, 15%, 65%)"
                        tick={{ fill: 'hsl(218, 15%, 65%)', fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="hsl(218, 15%, 65%)"
                        tick={{ fill: 'hsl(218, 15%, 65%)', fontSize: 12 }}
                        unit="%"
                        domain={isWithKroix ? [0, 20] : [0, 40]}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(220, 30%, 10%)', 
                          border: '1px solid hsl(220, 25%, 20%)',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: 'hsl(216, 33%, 93%)' }}
                      />
                      <Bar 
                        dataKey="value" 
                        fill={isWithKroix ? "hsl(32, 95%, 50%)" : "hsl(0, 60%, 50%)"} 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}