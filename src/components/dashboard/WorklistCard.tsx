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
        "group relative bg-white rounded-xl border px-4 py-3 cursor-pointer transition-all duration-200 overflow-hidden",
        isSelected 
          ? "border-landing-primary ring-2 ring-landing-primary/20" 
          : "border-[rgba(0,0,0,0.06)] hover:border-landing-primary/30"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Checkbox */}
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <Checkbox 
            checked={isChecked}
            onCheckedChange={onCheck}
            className="border-landing-muted data-[state=checked]:bg-landing-primary data-[state=checked]:border-landing-primary"
          />
        </div>

        {/* Study ID */}
        <div className="shrink-0 hidden xl:block">
          <p className="font-mono text-[12px] text-landing-muted w-[200px] truncate">
            {item.study.id}
          </p>
        </div>
        
        {/* Patient Hash */}
        <div className="shrink-0 min-w-[100px] max-w-[160px]">
          <h3 className="font-serif text-[15px] font-medium text-landing-heading truncate">
            {item.study.patient_hash}
          </h3>
        </div>
        
        {/* Time */}
        <div className="shrink-0 hidden sm:flex items-center gap-1.5 text-[12px] text-landing-body">
          <Clock className="w-3 h-3 text-landing-muted" />
          {formatStudyTime(item.study.study_time)}
        </div>
        
        {/* Modality */}
        {item.study.modality && (
          <span className="shrink-0 hidden md:inline-block px-1.5 py-0.5 bg-landing-bg rounded text-[11px] text-landing-body">
            {item.study.modality}
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1 min-w-2" />

        {/* Risk Score */}
        {item.triage ? (
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-16 h-1.5 bg-landing-bg rounded-full overflow-hidden hidden sm:block">
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
              "font-mono text-[12px] font-semibold",
              bucket === "CRITICAL" && "text-red-600",
              bucket === "REVIEW" && "text-amber-600",
              bucket === "CLEAR" && "text-emerald-600",
            )}>
              {(item.triage.risk_score * 100).toFixed(0)}%
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-2 h-2 rounded-full bg-landing-muted animate-pulse" />
            <span className="text-[11px] text-landing-muted italic">Pending</span>
          </div>
        )}

        {/* Priority Badge */}
        {config && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-medium shrink-0",
            config.bgColor, config.textColor, "border", config.borderColor
          )}>
            <Icon className="w-3 h-3" />
            <span className="hidden sm:inline">{config.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
