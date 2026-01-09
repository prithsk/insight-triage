import { cn } from "@/lib/utils";
import { LabResult } from "@/lib/types";

interface LabFlagsProps {
  labs: LabResult | null;
  compact?: boolean;
  className?: string;
}

const getLabStatus = (type: "co2" | "ph" | "o2", value: number | null) => {
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
  }
};

export function LabFlags({ labs, compact = false, className }: LabFlagsProps) {
  if (!labs) return null;
  
  const items = [
    { type: "co2" as const, label: "CO₂", value: labs.co2, unit: "mmHg" },
    { type: "ph" as const, label: "pH", value: labs.ph, unit: "" },
    { type: "o2" as const, label: "O₂", value: labs.o2, unit: "%" },
  ];
  
  const flaggedItems = items
    .map(item => ({ ...item, status: getLabStatus(item.type, item.value) }))
    .filter(item => item.status && item.status.status !== "normal");
  
  if (compact) {
    // Show only abnormal flags as badges
    if (flaggedItems.length === 0) return null;
    
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {flaggedItems.map(item => (
          <span
            key={item.type}
            className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded",
              item.status?.status === "high" && "bg-critical/20 text-critical",
              item.status?.status === "low" && "bg-warning/20 text-warning"
            )}
          >
            {item.label}{item.status?.label}
          </span>
        ))}
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
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className={cn(
                "font-mono text-sm font-medium",
                isAbnormal && status?.status === "high" && "text-critical",
                isAbnormal && status?.status === "low" && "text-warning",
                !isAbnormal && "text-foreground"
              )}>
                {item.value?.toFixed(item.type === "ph" ? 2 : 0) ?? "—"}
                {item.value !== null && item.unit && (
                  <span className="text-muted-foreground ml-1 text-xs">{item.unit}</span>
                )}
              </span>
              {isAbnormal && (
                <span className={cn(
                  "text-xs",
                  status?.status === "high" && "text-critical",
                  status?.status === "low" && "text-warning"
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
