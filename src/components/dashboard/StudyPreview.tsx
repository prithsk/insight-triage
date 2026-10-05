import { WorklistItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { LANGUAGE } from "@/lib/constants";
import { ExternalLink, Activity, FileSearch, Zap, Trash2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { useRunInference, useDeleteStudy } from "@/hooks/useStudies";
import { useDicomImage } from "@/hooks/useDicomImage";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface StudyPreviewProps {
  item: WorklistItem | null;
  onDeleted?: () => void;
}

export function StudyPreview({ item, onDeleted }: StudyPreviewProps) {
  const navigate = useNavigate();
  const runInference = useRunInference();
  const deleteStudy = useDeleteStudy();
  const { imageUrl } = useDicomImage(item?.study.file_path || null);
  
  if (!item) {
    return null;
  }
  
  const handleOpenReviewer = () => {
    navigate(`/reviewer/${item.study.id}`);
  };

  const handleRunInference = () => {
    runInference.mutate(item.study.id);
  };

  const handleDelete = () => {
    deleteStudy.mutate(item.study.id, {
      onSuccess: () => {
        onDeleted?.();
      }
    });
  };

  const formatStudyTime = (timeStr: string) => {
    try {
      return format(parseISO(timeStr), "MMMM d, yyyy 'at' HH:mm");
    } catch {
      return timeStr;
    }
  };

  const bucket = item.triage?.risk_bucket;
  
  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] font-mono text-kx-muted mb-1">
              {item.study.id}
            </p>
            <h2 className="font-display text-[28px] font-medium text-kx-ink tracking-[-0.01em]">
              {item.study.patient_hash}
            </h2>
            <p className="text-[14px] text-kx-muted mt-1">
              {formatStudyTime(item.study.study_time)}
            </p>
          </div>
          
          {/* Priority badge */}
          {item.triage && (
            <div className={cn(
              "px-4 py-2 rounded-xl font-mono text-[14px] font-medium",
              bucket === "CRITICAL" && "bg-kx-critical/10 text-kx-critical-ink border border-kx-critical/25",
              bucket === "REVIEW" && "bg-kx-warn/10 text-kx-warn border border-kx-warn/25",
              bucket === "CLEAR" && "bg-kx-accent3/10 text-kx-accent3 border border-kx-accent3/25",
            )}>
              {bucket}
            </div>
          )}
        </div>
      </div>
      
      {/* Preview Image */}
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-kx-ink mb-6">
        {imageUrl ? (
          <>
            <img 
              src={imageUrl} 
              alt="Study preview" 
              className="w-full h-full object-contain"
              style={{ filter: 'contrast(1.1) brightness(0.95)' }}
            />
            {/* Localisation chip.
                Gated on a heatmap actually EXISTING, not on the bucket. It used
                to render for every study whose bucket was not CLEAR, so a study
                with no localisation at all still got an "Area of Interest" chip
                laid over the patient's radiograph — a localisation claim with
                nothing behind it, which is the shape of the `buildLegacyHeatmap`
                fabrication removed on 2026-09-25 rather than a lighter version
                of it. Gemini's path returns no localisation whatsoever. The
                Reviewer already says "No localization for this study"; this
                panel now agrees with it by staying silent. */}
            {item.triage?.roi_heatmap_path && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-kx-critical/20 backdrop-blur-sm rounded-lg px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-kx-critical" aria-hidden />
                <span className="text-[12px] text-kx-canvas font-medium">
                  {LANGUAGE.AREA_OF_INTEREST}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Activity className="w-12 h-12 text-kx-muted mb-3" />
            <span className="text-[14px] text-kx-muted">
              {item.study.modality || 'CXR'} Preview
            </span>
          </div>
        )}
      </div>
      
      {/* Risk Score Card */}
      {item.triage ? (
        <div className="bg-white rounded-2xl border border-kx-border p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[13px] font-medium text-kx-muted uppercase tracking-wide">
              {LANGUAGE.RISK_SCORE}
            </span>
          </div>
          
          <div className="flex items-end gap-4">
            <span className={cn(
              "font-mono text-[48px] font-bold leading-none",
              bucket === "CRITICAL" && "text-kx-critical-ink",
              bucket === "REVIEW" && "text-kx-warn",
              bucket === "CLEAR" && "text-kx-accent3",
            )}>
              {(item.triage.risk_score * 100).toFixed(0)}
            </span>
            <span className="text-[24px] text-kx-muted mb-1">%</span>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4 h-2 bg-kx-surface rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-700",
                bucket === "CRITICAL" && "bg-kx-critical",
                bucket === "REVIEW" && "bg-kx-warn",
                bucket === "CLEAR" && "bg-kx-accent3",
              )}
              style={{ width: `${item.triage.risk_score * 100}%` }}
            />
          </div>
          
          <div className="mt-4 pt-4 border-t border-kx-border flex justify-between text-[12px] text-kx-muted">
            <span>Model: <span className="font-mono">{item.triage.model_version}</span></span>
            {item.triage.inference_time_ms && (
              <span>Inference: <span className="font-mono">{item.triage.inference_time_ms}ms</span></span>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-kx-border p-6 mb-4">
          <div className="text-center">
            <p className="text-[14px] text-kx-muted mb-4">
              No triage result yet. Run inference to generate risk score.
            </p>
            <button 
              onClick={handleRunInference}
              disabled={runInference.isPending}
              className="px-5 py-2.5 rounded-[10px] border border-kx-accent3 text-kx-accent3 hover:bg-kx-accent3 hover:text-white transition-colors text-[14px] font-medium disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              <Zap className="w-4 h-4" />
              {runInference.isPending ? 'Running...' : 'Run Inference'}
            </button>
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="mt-auto space-y-3">
        <button 
          onClick={handleOpenReviewer}
          className="w-full px-7 py-3.5 bg-kx-accent3 text-white rounded-[10px] text-[15px] font-medium hover:opacity-90 transition-colors flex items-center justify-center gap-2"
        >
          Open in Reviewer
          <ArrowRight className="w-4 h-4" />
        </button>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="w-full px-5 py-2.5 rounded-[10px] border border-kx-critical/25 text-kx-critical-ink hover:bg-kx-critical/10 transition-colors text-[14px] flex items-center justify-center gap-2">
              <Trash2 className="w-4 h-4" />
              Delete Study
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-white border-kx-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-[20px]">Delete this study?</AlertDialogTitle>
              <AlertDialogDescription className="text-kx-muted">
                This will permanently delete the study, associated triage results 
                and any uploaded files. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-[10px]">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-kx-critical-ink hover:opacity-90 rounded-[10px]"
              >
                {deleteStudy.isPending ? 'Deleting...' : 'Delete Study'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
