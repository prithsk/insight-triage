import { WorklistItem, RiskBucket } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Clock, CheckCircle, Activity, Timer, HelpCircle } from "lucide-react";
import {
  targetStateOf, formatTargetLabel, formatDuration, describeTarget, arrivedAtOf,
  type TargetTone,
} from "@/lib/worklistOrder";

interface WorklistCardProps {
  item: WorklistItem;
  isSelected: boolean;
  isChecked: boolean;
  isMinimized?: boolean;
  /**
   * Epoch ms from the page's single clock. Passed in rather than read here so
   * every row and the sort itself are computed from the same instant — a row
   * that disagrees with its own position in the list is worse than no row.
   * Falls back to `Date.now()` only so the component stays usable in isolation.
   */
  now?: number;
  onSelect: () => void;
  onCheck: (checked: boolean) => void;
}

/**
 * Colour only where it means something. Inside the target window is plain
 * muted text: a worklist where every row is coloured tells you nothing.
 */
const toneClasses: Record<TargetTone, string> = {
  over:        "bg-kx-critical/10 text-kx-critical border border-kx-critical/25",
  approaching: "bg-amber-50 text-amber-700 border border-amber-200",
  ok:          "text-kx-muted border border-transparent",
  none:        "text-kx-muted border border-transparent",
};

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

export function WorklistCard({ item, isSelected, isChecked, isMinimized = false, now, onSelect, onCheck }: WorklistCardProps) {
  const bucket = item.triage?.risk_bucket;
  const config = bucket ? bucketConfig[bucket] : null;
  const Icon = config?.icon || Activity;

  const at = now ?? Date.now();
  const target = targetStateOf(item, at);
  const targetTitle = describeTarget(target);

  // Untriaged studies have no target, so show what IS known: how long they have
  // been waiting for the model. They sort below every scored study (see the
  // UNSCORED note in worklistOrder), and this is the row-level signal that the
  // position is deliberate rather than an accident.
  const arrivedAt = arrivedAtOf(item);
  const waitingLabel = Number.isFinite(arrivedAt)
    ? `awaiting triage · ${formatDuration(at - arrivedAt)}`
    : "awaiting triage";

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
          ? "border-kx-accent3 ring-2 ring-kx-accent3/20 shadow-[0_10px_30px_-14px_rgba(47,111,94,0.35)]"
          : "border-kx-border shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-kx-accent3/30 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-16px_rgba(18,21,26,0.18)]"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Checkbox */}
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <Checkbox 
            checked={isChecked}
            onCheckedChange={onCheck}
            className="border-kx-muted data-[state=checked]:bg-kx-accent3 data-[state=checked]:border-kx-accent3"
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
          <p className="font-mono text-[13px] text-kx-muted truncate whitespace-nowrap">
            {item.study.id}
          </p>
        </div>
        
        {/* Patient Hash - Always visible */}
        <div className="shrink-0 w-[160px]">
          <h3 className="font-display text-[16px] font-medium text-kx-ink truncate">
            {item.study.patient_hash}
          </h3>
        </div>
        
        {/* Upload time - reduce gap when minimized */}
        <div
          className={cn(
            "shrink-0 flex items-center text-[13px] text-kx-muted transition-all duration-300",
            isMinimized ? "gap-0.5 -ml-2" : "gap-1.5"
          )}
          title="Upload time. This is when the file reached Kroix, not the department's arrival time."
        >
          <Clock className="w-3.5 h-3.5 text-kx-muted" />
          {formatStudyTime(item.study.study_time)}
        </div>

        {/* Time to read-time target — why this row sits where it does.
            Always shown, so the ordering is legible rather than mysterious. */}
        <div
          title={targetTitle}
          className={cn(
            "shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-lg font-mono text-[12px] font-medium w-[132px] justify-center",
            toneClasses[target ? target.tone : "none"]
          )}
        >
          {target ? <Timer className="w-3.5 h-3.5" /> : <HelpCircle className="w-3.5 h-3.5" />}
          <span className="truncate">
            {target ? formatTargetLabel(target) : waitingLabel}
          </span>
        </div>

        {/* Modality */}
        {item.study.modality && (
          <span className="shrink-0 px-2 py-0.5 bg-kx-surface rounded text-[12px] text-kx-muted">
            {item.study.modality}
          </span>
        )}

        {/* Spacer for even distribution */}
        <div className="flex-1" />

        {/* Priority Badge - between CXR and risk score */}
        {config && (
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[12px] font-medium shrink-0",
            config.bgColor, config.textColor, "border", config.borderColor
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
            isMinimized ? "gap-1 -mr-3" : "gap-3"
          )}>
            {/* Risk bar - Animated hide when minimized */}
            <div 
              className={cn(
                "h-1.5 bg-kx-surface rounded-full overflow-hidden transition-all duration-300",
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
            <div className="w-2 h-2 rounded-full bg-kx-muted animate-pulse" />
            <span className="text-[12px] text-kx-muted italic">Pending...</span>
          </div>
        )}

        {/* End spacer for padding after risk score */}
        <div className="w-2 shrink-0" />
      </div>
    </div>
  );
}
