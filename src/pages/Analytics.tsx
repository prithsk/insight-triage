import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateMTTRData, generateThroughputData, generateOverrideData } from "@/lib/mock-data";
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

export default function Analytics() {
  const mttrData = useMemo(() => generateMTTRData(), []);
  const throughputData = useMemo(() => generateThroughputData(), []);
  const overrideData = useMemo(() => generateOverrideData(), []);
  
  // Calculate summary stats
  const avgMTTR = (mttrData.reduce((a, b) => a + b.value, 0) / mttrData.length).toFixed(2);
  const avgThroughput = Math.round(throughputData.reduce((a, b) => a + b.value, 0) / throughputData.length);
  const avgOverride = Math.round(overrideData.reduce((a, b) => a + b.value, 0) / overrideData.length);
  
  // Trend calculations (compare last vs first)
  const mttrTrend = mttrData[mttrData.length - 1].value - mttrData[0].value;
  const throughputTrend = throughputData[throughputData.length - 1].value - throughputData[0].value;
  
  return (
    <AppLayout>
      <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
        {/* Page Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-surface/50 backdrop-blur-sm">
          <div>
            <h1 className="text-2xl font-serif font-semibold tracking-tight">Operational Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track workflow improvements and pilot metrics
            </p>
          </div>

          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
        
        {/* Summary Cards - Glassmorphism */}
        <div className="grid grid-cols-3 gap-4 p-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Time to Review (Critical)</p>
                  <p className="text-3xl font-bold font-mono mt-1">{avgMTTR}m</p>
                </div>
                <div className={`flex items-center gap-1 text-sm px-2 py-1 rounded-full ${mttrTrend < 0 ? 'text-clear bg-clear/10' : 'text-critical bg-critical/10'}`}>
                  {mttrTrend < 0 ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  {Math.abs(mttrTrend).toFixed(2)}m
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Mean Time to Review</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Throughput</p>
                  <p className="text-3xl font-bold font-mono mt-1">{avgThroughput}</p>
                </div>
                <div className={`flex items-center gap-1 text-sm px-2 py-1 rounded-full ${throughputTrend > 0 ? 'text-clear bg-clear/10' : 'text-critical bg-critical/10'}`}>
                  {throughputTrend > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {Math.abs(throughputTrend)}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Scans per hour</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Override Rate</p>
                  <p className="text-3xl font-bold font-mono mt-1">{avgOverride}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <RotateCcw className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Priority corrections</span>
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
              <Card className="h-full flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <CardTitle className="text-sm font-medium">
                    Mean Time to Review (Critical Bucket) - Last 7 Days
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mttrData}>
                      <defs>
                        <linearGradient id="mttrGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(24, 8%, 18%)" />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(24, 10%, 60%)"
                        tick={{ fill: 'hsl(24, 10%, 60%)', fontSize: 12 }}
                      />
                      <YAxis
                        stroke="hsl(24, 10%, 60%)"
                        tick={{ fill: 'hsl(24, 10%, 60%)', fontSize: 12 }}
                        unit="m"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(24, 10%, 11%)',
                          border: '1px solid hsl(24, 8%, 18%)',
                          borderRadius: '12px',
                        }}
                        labelStyle={{ color: 'hsl(30, 15%, 92%)' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(24, 95%, 53%)"
                        fill="url(#mttrGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="throughput" className="flex-1 mt-4 min-h-0">
              <Card className="h-full flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <CardTitle className="text-sm font-medium">
                    Scans Reviewed per Hour - Last 7 Days
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={throughputData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(24, 8%, 18%)" />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(24, 10%, 60%)"
                        tick={{ fill: 'hsl(24, 10%, 60%)', fontSize: 12 }}
                      />
                      <YAxis
                        stroke="hsl(24, 10%, 60%)"
                        tick={{ fill: 'hsl(24, 10%, 60%)', fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(24, 10%, 11%)',
                          border: '1px solid hsl(24, 8%, 18%)',
                          borderRadius: '12px',
                        }}
                        labelStyle={{ color: 'hsl(30, 15%, 92%)' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(142, 71%, 45%)"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(142, 71%, 45%)' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="overrides" className="flex-1 mt-4 min-h-0">
              <Card className="h-full flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <CardTitle className="text-sm font-medium">
                    Priority Override Rate (%) - Last 7 Days
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overrideData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(24, 8%, 18%)" />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(24, 10%, 60%)"
                        tick={{ fill: 'hsl(24, 10%, 60%)', fontSize: 12 }}
                      />
                      <YAxis
                        stroke="hsl(24, 10%, 60%)"
                        tick={{ fill: 'hsl(24, 10%, 60%)', fontSize: 12 }}
                        unit="%"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(24, 10%, 11%)',
                          border: '1px solid hsl(24, 8%, 18%)',
                          borderRadius: '12px',
                        }}
                        labelStyle={{ color: 'hsl(30, 15%, 92%)' }}
                      />
                      <Bar
                        dataKey="value"
                        fill="hsl(24, 95%, 53%)"
                        radius={[6, 6, 0, 0]}
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
