import { cn } from "@/lib/utils";
import { LabResult } from "@/lib/types";

interface LabFlagsProps {
  labs: LabResult | null;
  compact?: boolean;
  className?: string;
}

const getLabStatus = (type: "co2" | "ph" | "o2" | "wbc" | "crp" | "procalcitonin", value: number | null) => {
  if (value === null) return null;
  
  switch (type) {
    case "co2":
      if (value > 50) return { status: "high", label: "↑" };
      if (value < 35) return { status: "low", label: "↓" };
      return { status: "normal", label: "" };
    case "ph":
      if (value < 7.35) return { status: "low", label: "↓" };
      if (value > 7.45) return { status: "high", label: "↑" };
      return { status: "normal", label: "" };
    case "o2":
      if (value < 90) return { status: "low", label: "↓" };
      return { status: "normal", label: "" };
    case "wbc":
      if (value > 11) return { status: "high", label: "↑" };
      if (value < 4) return { status: "low", label: "↓" };
      return { status: "normal", label: "" };
    case "crp":
      if (value > 10) return { status: "high", label: "↑" };
      if (value > 3) return { status: "elevated", label: "↑" };
      return { status: "normal", label: "" };
    case "procalcitonin":
      if (value > 0.5) return { status: "high", label: "↑" };
      if (value > 0.1) return { status: "elevated", label: "↑" };
      return { status: "normal", label: "" };
  }
};

export function LabFlags({ labs, compact = false, className }: LabFlagsProps) {
  if (!labs) return null;
  
  const items = [
    { type: "co2" as const, label: "CO₂", value: labs.co2, unit: "mmHg" },
    { type: "ph" as const, label: "pH", value: labs.ph, unit: "" },
    { type: "o2" as const, label: "O₂", value: labs.o2, unit: "%" },
    { type: "wbc" as const, label: "WBC", value: labs.wbc, unit: "K/μL" },
    { type: "crp" as const, label: "CRP", value: labs.crp, unit: "mg/L" },
    { type: "procalcitonin" as const, label: "PCT", value: labs.procalcitonin, unit: "ng/mL" },
  ];
  
  const flaggedItems = items
    .map(item => ({ ...item, status: getLabStatus(item.type, item.value) }))
    .filter(item => item.status && item.status.status !== "normal");
  
  if (compact) {
    // Show all biomarkers inline with status colors
    return (
      <div className={cn("flex flex-wrap items-center gap-1", className)}>
        {items.map(item => {
          const status = getLabStatus(item.type, item.value);
          const isAbnormal = status && status.status !== "normal";
          
          if (item.value === null) return null;
          
          return (
            <span
              key={item.type}
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap",
                isAbnormal && status?.status === "high" && "bg-critical/20 text-critical",
                isAbnormal && status?.status === "elevated" && "bg-warning/20 text-warning",
                isAbnormal && status?.status === "low" && "bg-warning/20 text-warning",
                !isAbnormal && "bg-muted text-muted-foreground"
              )}
              title={`${item.label}: ${item.value?.toFixed(item.type === "ph" || item.type === "procalcitonin" ? 2 : item.type === "wbc" || item.type === "crp" ? 1 : 0)} ${item.unit}`}
            >
              {item.label}
              {isAbnormal && status?.label}
            </span>
          );
        })}
      </div>
    );
  }
  
  // Full display
  return (
    <div className={cn("space-y-3", className)}>
      {items.map(item => {
        const status = getLabStatus(item.type, item.value);
        const isAbnormal = status && status.status !== "normal";
        
        return (
          <div key={item.type} className="flex items-center justify-between">
            <span className="text-sm text-landing-muted">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className={cn(
                "font-mono text-sm font-medium",
                isAbnormal && (status?.status === "high" || status?.status === "elevated") && "text-red-600",
                isAbnormal && status?.status === "low" && "text-amber-600",
                !isAbnormal && "text-landing-heading"
              )}>
                {item.value?.toFixed(item.type === "ph" || item.type === "procalcitonin" ? 2 : item.type === "wbc" || item.type === "crp" ? 1 : 0) ?? "—"}
                {item.value !== null && item.unit && (
                  <span className="text-landing-muted ml-1 text-xs">{item.unit}</span>
                )}
              </span>
              {isAbnormal && (
                <span className={cn(
                  "text-xs font-medium",
                  (status?.status === "high" || status?.status === "elevated") && "text-red-600",
                  status?.status === "low" && "text-amber-600"
                )}>
                  {status?.label}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
