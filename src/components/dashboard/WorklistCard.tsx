import { WorklistItem, RiskBucket } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Clock, CheckCircle, Activity } from "lucide-react";

interface WorklistCardProps {
  item: WorklistItem;
  isSelected: boolean;
  isChecked: boolean;
  isMinimized?: boolean;
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

export function WorklistCard({ item, isSelected, isChecked, isMinimized = false, onSelect, onCheck }: WorklistCardProps) {
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
        "group relative bg-white rounded-xl border px-5 py-4 cursor-pointer transition-all duration-200 overflow-hidden",
        isSelected 
          ? "border-landing-primary ring-2 ring-landing-primary/20" 
          : "border-[rgba(0,0,0,0.06)] hover:border-landing-primary/30"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Checkbox */}
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <Checkbox 
            checked={isChecked}
            onCheckedChange={onCheck}
            className="border-landing-muted data-[state=checked]:bg-landing-primary data-[state=checked]:border-landing-primary"
          />
        </div>

        {/* Study ID (Medical ID) - Animated hide when minimized */}
        <div 
          className={cn(
            "shrink-0 transition-all duration-300 overflow-hidden",
            isMinimized 
              ? "w-0 opacity-0" 
              : "w-[220px] opacity-100"
          )}
        >
          <p className="font-mono text-[13px] text-landing-muted truncate whitespace-nowrap">
            {item.study.id}
          </p>
        </div>
        
        {/* Patient Hash - Always visible */}
        <div className="shrink-0 w-[160px]">
          <h3 className="font-serif text-[16px] font-medium text-landing-heading truncate">
            {item.study.patient_hash}
          </h3>
        </div>
        
        {/* Time - reduce gap when minimized */}
        <div className={cn(
          "shrink-0 flex items-center text-[13px] text-landing-body transition-all duration-300",
          isMinimized ? "gap-0.5 -ml-2" : "gap-1.5"
        )}>
          <Clock className="w-3.5 h-3.5 text-landing-muted" />
          {formatStudyTime(item.study.study_time)}
        </div>
        
        {/* Modality */}
        {item.study.modality && (
          <span className="shrink-0 px-2 py-0.5 bg-landing-bg rounded text-[12px] text-landing-body">
            {item.study.modality}
          </span>
        )}

        {/* Spacer for even distribution */}
        <div className="flex-1" />

        {/* Priority Badge - between CXR and risk score */}
        {config && (
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[12px] font-medium shrink-0",
            config.bgColor, config.textColor, "border", config.borderColor,
            isMinimized && "w-[85px] justify-center"
          )}>
            <Icon className="w-3.5 h-3.5" />
            {config.label}
          </div>
        )}

        {/* Spacer for even distribution */}
        <div className="flex-1" />

        {/* Risk Score */}
        {item.triage ? (
          <div className={cn(
            "flex items-center shrink-0 transition-all duration-300",
            isMinimized ? "gap-1 -mr-1" : "gap-3"
          )}>
            <div 
              className={cn(
                "h-1.5 bg-landing-bg rounded-full overflow-hidden transition-all duration-300",
                isMinimized 
                  ? "w-0 opacity-0" 
                  : "w-20 opacity-100"
              )}
            >
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
            <span className={cn(
              "font-mono text-[13px] font-semibold w-10 text-right",
              bucket === "CRITICAL" && "text-red-600",
              bucket === "REVIEW" && "text-amber-600",
              bucket === "CLEAR" && "text-emerald-600",
            )}>
              {(item.triage.risk_score * 100).toFixed(0)}%
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-2 h-2 rounded-full bg-landing-muted animate-pulse" />
            <span className="text-[12px] text-landing-muted italic">Pending...</span>
          </div>
        )}

        {/* End spacer for padding after risk score */}
        <div className="w-2 shrink-0" />
      </div>
    </div>
  );
}
