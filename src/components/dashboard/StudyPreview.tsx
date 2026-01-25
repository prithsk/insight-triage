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
            <p className="text-[13px] font-mono text-landing-muted mb-1">
              {item.study.id}
            </p>
            <h2 className="font-serif text-[28px] font-medium text-landing-heading tracking-[-0.01em]">
              {item.study.patient_hash}
            </h2>
            <p className="text-[14px] text-landing-body mt-1">
              {formatStudyTime(item.study.study_time)}
            </p>
          </div>
          
          {/* Priority badge */}
          {item.triage && (
            <div className={cn(
              "px-4 py-2 rounded-xl font-mono text-[14px] font-medium",
              bucket === "CRITICAL" && "bg-red-50 text-red-700 border border-red-200",
              bucket === "REVIEW" && "bg-amber-50 text-amber-700 border border-amber-200",
              bucket === "CLEAR" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
            )}>
              {bucket}
            </div>
          )}
        </div>
      </div>
      
      {/* Preview Image */}
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-landing-heading mb-6">
        {imageUrl ? (
          <>
            <img 
              src={imageUrl} 
              alt="Study preview" 
              className="w-full h-full object-contain"
              style={{ filter: 'contrast(1.1) brightness(0.95)' }}
            />
            {/* ROI Overlay hint */}
            {item.triage && item.triage.risk_bucket !== "CLEAR" && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-orange-500/20 backdrop-blur-sm rounded-lg px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-[12px] text-orange-500 font-medium">
                  {LANGUAGE.AREA_OF_INTEREST}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Activity className="w-12 h-12 text-landing-muted mb-3" />
            <span className="text-[14px] text-landing-muted">
              {item.study.modality || 'CXR'} Preview
            </span>
          </div>
        )}
      </div>
      
      {/* Risk Score Card */}
      {item.triage ? (
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[13px] font-medium text-landing-muted uppercase tracking-wide">
              {LANGUAGE.RISK_SCORE}
            </span>
            <span className="text-[12px] text-landing-muted">
              Confidence: {(item.triage.confidence * 100).toFixed(0)}%
            </span>
          </div>
          
          <div className="flex items-end gap-4">
            <span className={cn(
              "font-mono text-[48px] font-bold leading-none",
              bucket === "CRITICAL" && "text-red-600",
              bucket === "REVIEW" && "text-amber-600",
              bucket === "CLEAR" && "text-emerald-600",
            )}>
              {(item.triage.risk_score * 100).toFixed(0)}
            </span>
            <span className="text-[24px] text-landing-muted mb-1">%</span>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4 h-2 bg-landing-bg rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-700",
                bucket === "CRITICAL" && "bg-red-500",
                bucket === "REVIEW" && "bg-amber-500",
                bucket === "CLEAR" && "bg-emerald-500",
              )}
              style={{ width: `${item.triage.risk_score * 100}%` }}
            />
          </div>
          
          <div className="mt-4 pt-4 border-t border-[rgba(0,0,0,0.06)] flex justify-between text-[12px] text-landing-muted">
            <span>Model: <span className="font-mono">{item.triage.model_version}</span></span>
            {item.triage.inference_time_ms && (
              <span>Inference: <span className="font-mono">{item.triage.inference_time_ms}ms</span></span>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-6 mb-4">
          <div className="text-center">
            <p className="text-[14px] text-landing-body mb-4">
              No triage result yet. Run inference to generate risk score.
            </p>
            <button 
              onClick={handleRunInference}
              disabled={runInference.isPending}
              className="px-5 py-2.5 rounded-[10px] border border-landing-primary text-landing-primary hover:bg-landing-primary hover:text-white transition-colors text-[14px] font-medium disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              <Zap className="w-4 h-4" />
              {runInference.isPending ? 'Running...' : 'Run Inference'}
            </button>
          </div>
        </div>
      )}
      
      {/* Lab Values */}
      {item.labs && (
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-5 mb-6">
          <span className="text-[13px] font-medium text-landing-muted uppercase tracking-wide block mb-4">
            Lab Values
          </span>
          <div className="grid grid-cols-3 gap-3">
            {item.labs.wbc && (
              <div className="text-center p-3 bg-landing-bg rounded-xl">
                <p className="text-[11px] text-landing-muted mb-1">WBC</p>
                <p className="font-mono text-[16px] font-semibold text-landing-heading">{item.labs.wbc}</p>
              </div>
            )}
            {item.labs.crp && (
              <div className="text-center p-3 bg-landing-bg rounded-xl">
                <p className="text-[11px] text-landing-muted mb-1">CRP</p>
                <p className="font-mono text-[16px] font-semibold text-landing-heading">{item.labs.crp}</p>
              </div>
            )}
            {item.labs.procalcitonin && (
              <div className="text-center p-3 bg-landing-bg rounded-xl">
                <p className="text-[11px] text-landing-muted mb-1">PCT</p>
                <p className="font-mono text-[16px] font-semibold text-landing-heading">{item.labs.procalcitonin}</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="mt-auto space-y-3">
        <button 
          onClick={handleOpenReviewer}
          className="w-full px-7 py-3.5 bg-landing-primary text-white rounded-[10px] text-[15px] font-medium hover:bg-[#265A4C] transition-colors flex items-center justify-center gap-2"
        >
          Open in Reviewer
          <ArrowRight className="w-4 h-4" />
        </button>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="w-full px-5 py-2.5 rounded-[10px] border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-[14px] flex items-center justify-center gap-2">
              <Trash2 className="w-4 h-4" />
              Delete Study
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-white border-[rgba(0,0,0,0.06)]">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-serif text-[20px]">Delete this study?</AlertDialogTitle>
              <AlertDialogDescription className="text-landing-body">
                This will permanently delete the study, associated triage results, lab values, 
                and any uploaded files. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-[10px]">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 rounded-[10px]"
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
