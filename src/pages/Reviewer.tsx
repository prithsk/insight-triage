import { useState } from "react";
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
import { useStudy, useSubmitFeedback, FeedbackType } from "@/hooks/useStudies";
import { 
  Check, 
  AlertTriangle, 
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Eye,
  Activity,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorklistItem } from "@/lib/types";

export default function Reviewer() {
  const [searchParams] = useSearchParams();
  const studyId = searchParams.get("studyId");
  
  // Fetch study data from database
  const { data: studyData, isLoading } = useStudy(studyId || undefined);
  
  const [showROI, setShowROI] = useState(true);
  const [roiOpacity, setRoiOpacity] = useState([70]);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [submittedFeedback, setSubmittedFeedback] = useState<string | null>(null);
  
  const submitFeedback = useSubmitFeedback();
  
  const handleFeedback = (type: FeedbackType) => {
    if (!studyData) return;
    
    const triageResult = studyData.triage_results?.[0];
    
    submitFeedback.mutate({
      studyId: studyData.id,
      triageResultId: triageResult?.id,
      feedbackType: type,
      notes: feedbackNote || undefined
    }, {
      onSuccess: () => {
        setSubmittedFeedback(type);
        setFeedbackNote("");
        setTimeout(() => setSubmittedFeedback(null), 2000);
      }
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }
  
  if (!studyData) {
    return (
      <AppLayout>
        <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
          <p className="text-muted-foreground">No study selected</p>
        </div>
      </AppLayout>
    );
  }

  // Transform to WorklistItem format for components
  const latestTriage = studyData.triage_results?.[0];
  const latestLab = studyData.lab_results?.[0];

  const item: WorklistItem = {
    study: {
      id: studyData.id,
      patient_hash: studyData.patient_hash,
      study_time: studyData.study_time,
      modality: studyData.modality,
      file_path: studyData.file_path,
      thumbnail_path: studyData.thumbnail_path,
      status: studyData.status,
      site_id: studyData.site_id,
      created_at: studyData.created_at,
      updated_at: studyData.updated_at
    },
    triage: latestTriage ? {
      id: latestTriage.id,
      study_id: latestTriage.study_id,
      risk_score: Number(latestTriage.risk_score),
      risk_bucket: latestTriage.risk_bucket,
      confidence: Number(latestTriage.confidence),
      roi_heatmap_path: latestTriage.roi_heatmap_path,
      model_version: latestTriage.model_version,
      inference_time_ms: latestTriage.inference_time_ms,
      created_at: latestTriage.created_at
    } : null,
    labs: latestLab ? {
      id: latestLab.id,
      study_id: latestLab.study_id,
      co2: latestLab.co2 ? Number(latestLab.co2) : null,
      ph: latestLab.ph ? Number(latestLab.ph) : null,
      o2: latestLab.o2 ? Number(latestLab.o2) : null,
      wbc: latestLab.wbc ? Number(latestLab.wbc) : null,
      crp: latestLab.crp ? Number(latestLab.crp) : null,
      procalcitonin: latestLab.procalcitonin ? Number(latestLab.procalcitonin) : null,
      source: latestLab.source,
      timestamp: latestLab.timestamp
    } : null
  };
  
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
                <div>
                  <h2 className="font-mono font-semibold">{item.study.patient_hash}</h2>
                  <p className="text-xs text-muted-foreground font-mono">{item.study.id.slice(0, 8)}...</p>
                </div>
                {item.triage && (
                  <BucketBadge bucket={item.triage.risk_bucket} />
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
                  {showROI && item.triage && item.triage.risk_bucket !== "CLEAR" && (
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
                    <BucketBadge bucket={item.triage.risk_bucket} size="lg" />
                    <RiskScore 
                      score={item.triage.risk_score}
                      bucket={item.triage.risk_bucket}
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
                      <p className="font-mono text-sm">{item.triage.model_version}</p>
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
                      Source: {item.labs.source || 'Unknown'}
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
                    onClick={() => handleFeedback("CORRECT_PRIORITY")}
                    disabled={submitFeedback.isPending}
                    className={cn(
                      "flex-col h-auto py-3 gap-1",
                      submittedFeedback === "CORRECT_PRIORITY" && "bg-clear/20 border-clear"
                    )}
                  >
                    <Check className="w-4 h-4 text-clear" />
                    <span className="text-xs">Correct</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFeedback("FALSE_ALARM")}
                    disabled={submitFeedback.isPending}
                    className={cn(
                      "flex-col h-auto py-3 gap-1",
                      submittedFeedback === "FALSE_ALARM" && "bg-warning/20 border-warning"
                    )}
                  >
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <span className="text-xs">False Alarm</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFeedback("MISSED_URGENCY")}
                    disabled={submitFeedback.isPending}
                    className={cn(
                      "flex-col h-auto py-3 gap-1",
                      submittedFeedback === "MISSED_URGENCY" && "bg-critical/20 border-critical"
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
