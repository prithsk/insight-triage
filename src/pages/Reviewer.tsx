import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { BucketBadge } from "@/components/ui/bucket-badge";
import { RiskScore } from "@/components/ui/risk-score";
import { LabFlags } from "@/components/ui/lab-flags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { LANGUAGE } from "@/lib/constants";
import { generateMockWorklistItems } from "@/lib/mock-data";
import { 
  Check, 
  AlertTriangle, 
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Eye,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Reviewer() {
  const [searchParams] = useSearchParams();
  const studyId = searchParams.get("studyId");
  
  // Get study data (mock)
  const worklistItems = useMemo(() => generateMockWorklistItems(20), []);
  const item = useMemo(() => {
    if (studyId) {
      return worklistItems.find(w => w.study.id === studyId) || worklistItems[0];
    }
    return worklistItems[0];
  }, [studyId, worklistItems]);
  
  const [showROI, setShowROI] = useState(true);
  const [roiOpacity, setRoiOpacity] = useState([70]);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [submittedFeedback, setSubmittedFeedback] = useState<string | null>(null);
  
  const handleFeedback = (type: string) => {
    setSubmittedFeedback(type);
    setTimeout(() => setSubmittedFeedback(null), 2000);
  };
  
  if (!item) {
    return (
      <AppLayout>
        <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
          <p className="text-muted-foreground">No study selected</p>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <div className="h-[calc(100vh-3.5rem)] flex flex-col">
        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: DICOM Viewer */}
          <div className="flex-1 flex flex-col bg-background">
            {/* Viewer Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
              <div className="flex items-center gap-4">
                <h2 className="font-mono font-semibold">{item.study.id}</h2>
                {item.triage && (
                  <BucketBadge bucket={item.triage.riskBucket} />
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <RotateCw className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* DICOM Viewer Area */}
            <div className="flex-1 relative bg-black flex items-center justify-center">
              {/* Simulated X-ray */}
              <div className="w-full h-full max-w-3xl max-h-full p-8 flex items-center justify-center">
                <div className="relative w-full h-full bg-gradient-to-b from-zinc-900 to-zinc-800 rounded-lg overflow-hidden">
                  {/* Chest X-ray simulation */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Activity className="w-48 h-48 text-zinc-700" />
                  </div>
                  
                  {/* ROI Overlay */}
                  {showROI && item.triage && item.triage.riskBucket !== "CLEAR" && (
                    <div 
                      className="absolute top-1/4 right-1/4 w-32 h-32"
                      style={{ opacity: roiOpacity[0] / 100 }}
                    >
                      <div className="w-full h-full rounded-full border-2 border-overlay-accent bg-overlay-accent/20 animate-pulse-slow" />
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-overlay-accent/90 text-xs font-medium px-2 py-1 rounded whitespace-nowrap">
                        {LANGUAGE.AREA_OF_INTEREST}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Right: Sidebar */}
          <div className="w-80 border-l border-border bg-surface flex flex-col overflow-auto scrollbar-clinical">
            {/* Priority Panel */}
            {item.triage && (
              <Card className="m-4 bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    {LANGUAGE.PRIORITY}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <BucketBadge bucket={item.triage.riskBucket} size="lg" />
                    <RiskScore 
                      score={item.triage.riskScore}
                      bucket={item.triage.riskBucket}
                      size="lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Confidence</p>
                      <p className="font-mono font-medium">
                        {(item.triage.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Model</p>
                      <p className="font-mono text-sm">{item.triage.modelVersion}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* ROI Controls */}
            <Card className="mx-4 mb-4 bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  ROI Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Show {LANGUAGE.AREA_OF_INTEREST}</span>
                  <Switch checked={showROI} onCheckedChange={setShowROI} />
                </div>
                {showROI && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Opacity</span>
                      <span className="font-mono">{roiOpacity[0]}%</span>
                    </div>
                    <Slider
                      value={roiOpacity}
                      onValueChange={setRoiOpacity}
                      min={20}
                      max={100}
                      step={10}
                      className="w-full"
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Highlights regions correlated with elevated risk score. {LANGUAGE.NON_DIAGNOSTIC}.
                </p>
              </CardContent>
            </Card>
            
            {/* Lab Panel */}
            <Card className="mx-4 mb-4 bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Lab Values
                </CardTitle>
              </CardHeader>
              <CardContent>
                {item.labs ? (
                  <>
                    <LabFlags labs={item.labs} />
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                      Source: {item.labs.source}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{LANGUAGE.EMPTY.LABS}</p>
                )}
              </CardContent>
            </Card>
            
            {/* Feedback Panel */}
            <Card className="mx-4 mb-4 bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFeedback("correct")}
                    className={cn(
                      "flex-col h-auto py-3 gap-1",
                      submittedFeedback === "correct" && "bg-clear/20 border-clear"
                    )}
                  >
                    <Check className="w-4 h-4 text-clear" />
                    <span className="text-xs">Correct</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFeedback("false_alarm")}
                    className={cn(
                      "flex-col h-auto py-3 gap-1",
                      submittedFeedback === "false_alarm" && "bg-warning/20 border-warning"
                    )}
                  >
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <span className="text-xs">False Alarm</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFeedback("missed")}
                    className={cn(
                      "flex-col h-auto py-3 gap-1",
                      submittedFeedback === "missed" && "bg-critical/20 border-critical"
                    )}
                  >
                    <AlertCircle className="w-4 h-4 text-critical" />
                    <span className="text-xs">Missed</span>
                  </Button>
                </div>
                <Textarea
                  placeholder="Add quick note (optional)"
                  value={feedbackNote}
                  onChange={(e) => setFeedbackNote(e.target.value)}
                  className="h-20 resize-none"
                />
              </CardContent>
            </Card>
            
            {/* Spacer */}
            <div className="flex-1" />
          </div>
        </div>
        
        {/* Footer Disclaimer - Always visible */}
        <div className="disclaimer-bar text-center">
          {LANGUAGE.DISCLAIMER}
        </div>
      </div>
    </AppLayout>
  );
}
