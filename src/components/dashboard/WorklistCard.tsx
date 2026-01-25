import { WorklistItem, RiskBucket } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Clock, CheckCircle, Activity } from "lucide-react";

interface WorklistCardProps {
  item: WorklistItem;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onCheck: (checked: boolean) => void;
}

const bucketConfig: Record<RiskBucket, { 
  label: string; 
  bgColor: string; 
  textColor: string;
  borderColor: string;
  icon: typeof AlertTriangle;
}> = {
  CRITICAL: { 
    label: "Critical", 
    bgColor: "bg-red-50", 
    textColor: "text-red-700",
    borderColor: "border-red-200",
    icon: AlertTriangle,
  },
  REVIEW: { 
    label: "Review", 
    bgColor: "bg-amber-50", 
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
    icon: Clock,
  },
  CLEAR: { 
    label: "Clear", 
    bgColor: "bg-emerald-50", 
    textColor: "text-emerald-700",
    borderColor: "border-emerald-200",
    icon: CheckCircle,
  },
};

export function WorklistCard({ item, isSelected, isChecked, onSelect, onCheck }: WorklistCardProps) {
  const bucket = item.triage?.risk_bucket;
  const config = bucket ? bucketConfig[bucket] : null;
  const Icon = config?.icon || Activity;

  const formatStudyTime = (timeStr: string) => {
    try {
      return format(parseISO(timeStr), "MMM d, HH:mm");
    } catch {
      return timeStr;
    }
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative bg-white rounded-2xl border p-5 cursor-pointer transition-all duration-200",
        isSelected 
          ? "border-landing-primary ring-2 ring-landing-primary/20" 
          : "border-[rgba(0,0,0,0.06)] hover:border-landing-primary/30"
      )}
    >
      {/* Checkbox */}
      <div 
        className="absolute top-4 left-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox 
          checked={isChecked}
          onCheckedChange={onCheck}
          className="border-landing-muted data-[state=checked]:bg-landing-primary data-[state=checked]:border-landing-primary"
        />
      </div>

      {/* Priority Badge */}
      {config && (
        <div className={cn(
          "absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium",
          config.bgColor, config.textColor, "border", config.borderColor
        )}>
          <Icon className="w-3.5 h-3.5" />
          {config.label}
        </div>
      )}

      {/* Content */}
      <div className="mt-8">
        {/* Study ID */}
        <p className="font-mono text-[13px] text-landing-muted mb-1">
          {item.study.id.slice(0, 8)}...
        </p>
        
        {/* Patient Hash */}
        <h3 className="font-serif text-[18px] font-medium text-landing-heading mb-3 tracking-[-0.01em]">
          {item.study.patient_hash}
        </h3>
        
        {/* Metadata row */}
        <div className="flex items-center gap-4 text-[13px] text-landing-body">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-landing-muted" />
            {formatStudyTime(item.study.study_time)}
          </span>
          {item.study.modality && (
            <span className="px-2 py-0.5 bg-landing-bg rounded text-[12px]">
              {item.study.modality}
            </span>
          )}
        </div>

        {/* Risk Score */}
        {item.triage && (
          <div className="mt-4 pt-4 border-t border-[rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-landing-muted">Risk Score</span>
              <span className={cn(
                "font-mono text-[15px] font-semibold",
                bucket === "CRITICAL" && "text-red-600",
                bucket === "REVIEW" && "text-amber-600",
                bucket === "CLEAR" && "text-emerald-600",
              )}>
                {(item.triage.risk_score * 100).toFixed(0)}%
              </span>
            </div>
            {/* Score bar */}
            <div className="mt-2 h-1.5 bg-landing-bg rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  bucket === "CRITICAL" && "bg-red-500",
                  bucket === "REVIEW" && "bg-amber-500",
                  bucket === "CLEAR" && "bg-emerald-500",
                )}
                style={{ width: `${item.triage.risk_score * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Pending state */}
        {!item.triage && (
          <div className="mt-4 pt-4 border-t border-[rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-landing-muted animate-pulse" />
              <span className="text-[13px] text-landing-muted italic">Pending triage...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
