import { WorklistItem } from "@/lib/types";
import { BucketBadge } from "@/components/ui/bucket-badge";
import { RiskScore } from "@/components/ui/risk-score";
import { LabFlags } from "@/components/ui/lab-flags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LANGUAGE } from "@/lib/constants";
import { ExternalLink, Activity, FileSearch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface PreviewPanelProps {
  item: WorklistItem | null;
}

export function PreviewPanel({ item }: PreviewPanelProps) {
  const navigate = useNavigate();
  
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
  
  return (
    <div className="h-full flex flex-col p-6 animate-slide-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold font-mono">{item.study.id}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {format(item.study.studyTime, "MMMM d, yyyy 'at' HH:mm")}
          </p>
        </div>
        {item.triage && (
          <BucketBadge bucket={item.triage.riskBucket} size="lg" />
        )}
      </div>
      
      {/* Preview Image Placeholder */}
      <Card className="bg-muted/30 border-border mb-6 overflow-hidden">
        <div className="aspect-[4/3] flex items-center justify-center bg-background/50 relative">
          {/* Simulated X-ray thumbnail */}
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-background opacity-50" />
          <div className="relative z-10 flex flex-col items-center">
            <Activity className="w-12 h-12 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">CXR Preview</span>
          </div>
          
          {/* ROI Overlay hint */}
          {item.triage && item.triage.riskBucket !== "CLEAR" && (
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
      {item.triage && (
        <Card className="bg-surface border-border mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {LANGUAGE.RISK_SCORE}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <RiskScore 
                score={item.triage.riskScore} 
                bucket={item.triage.riskBucket}
                size="lg" 
              />
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Confidence</p>
                <p className="font-mono text-sm font-medium">
                  {(item.triage.confidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Model: <span className="font-mono">{item.triage.modelVersion}</span>
              </p>
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
              Source: {item.labs.source}
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
