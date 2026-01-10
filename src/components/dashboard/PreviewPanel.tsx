import { WorklistItem } from "@/lib/types";
import { BucketBadge } from "@/components/ui/bucket-badge";
import { RiskScore } from "@/components/ui/risk-score";
import { LabFlags } from "@/components/ui/lab-flags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LANGUAGE } from "@/lib/constants";
import { ExternalLink, Activity, FileSearch, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { useRunInference } from "@/hooks/useStudies";

interface PreviewPanelProps {
  item: WorklistItem | null;
}

export function PreviewPanel({ item }: PreviewPanelProps) {
  const navigate = useNavigate();
  const runInference = useRunInference();
  
  if (!item) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <FileSearch className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">{LANGUAGE.EMPTY.PREVIEW}</p>
        <p className="text-sm mt-2">Click on a study in the worklist</p>
      </div>
    );
  }
  
  const handleOpenReviewer = () => {
    navigate(`/reviewer?studyId=${item.study.id}`);
  };

  const handleRunInference = () => {
    runInference.mutate(item.study.id);
  };

  const formatStudyTime = (timeStr: string) => {
    try {
      return format(parseISO(timeStr), "MMMM d, yyyy 'at' HH:mm");
    } catch {
      return timeStr;
    }
  };
  
  return (
    <div className="h-full flex flex-col p-6 animate-slide-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold font-mono">{item.study.patient_hash}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {formatStudyTime(item.study.study_time)}
          </p>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            ID: {item.study.id}
          </p>
        </div>
        {item.triage && (
          <BucketBadge bucket={item.triage.risk_bucket} size="lg" />
        )}
      </div>
      
      {/* Preview Image Placeholder */}
      <Card className="bg-muted/30 border-border mb-6 overflow-hidden">
        <div className="aspect-[4/3] flex items-center justify-center bg-background/50 relative">
          {/* Simulated X-ray thumbnail */}
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-background opacity-50" />
          <div className="relative z-10 flex flex-col items-center">
            <Activity className="w-12 h-12 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">
              {item.study.modality || 'CXR'} Preview
            </span>
          </div>
          
          {/* ROI Overlay hint */}
          {item.triage && item.triage.risk_bucket !== "CLEAR" && (
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-overlay-accent/20 backdrop-blur-sm rounded px-2 py-1">
              <div className="w-2 h-2 rounded-full bg-overlay-accent" />
              <span className="text-xs text-overlay-accent font-medium">
                {LANGUAGE.AREA_OF_INTEREST}
              </span>
            </div>
          )}
        </div>
      </Card>
      
      {/* Risk Score Card */}
      {item.triage ? (
        <Card className="bg-surface border-border mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {LANGUAGE.RISK_SCORE}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <RiskScore 
                score={item.triage.risk_score} 
                bucket={item.triage.risk_bucket}
                size="lg" 
              />
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Confidence</p>
                <p className="font-mono text-sm font-medium">
                  {(item.triage.confidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs text-muted-foreground">
              <span>
                Model: <span className="font-mono">{item.triage.model_version}</span>
              </span>
              {item.triage.inference_time_ms && (
                <span>
                  Inference: <span className="font-mono">{item.triage.inference_time_ms}ms</span>
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-surface border-border mb-4">
          <CardContent className="py-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                No triage result yet. Run ML inference to generate risk score.
              </p>
              <Button 
                onClick={handleRunInference}
                disabled={runInference.isPending}
                variant="outline"
                className="gap-2"
              >
                <Zap className="w-4 h-4" />
                {runInference.isPending ? 'Running Inference...' : 'Run Inference'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Lab Panel */}
      {item.labs && (
        <Card className="bg-surface border-border mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Lab Values
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LabFlags labs={item.labs} />
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
              Source: {item.labs.source || 'Unknown'}
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Actions */}
      <div className="mt-auto">
        <Button 
          onClick={handleOpenReviewer}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          size="lg"
        >
          Open in Reviewer
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
