import { cn } from "@/lib/utils";
import { QueueState } from "@/lib/types";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { LANGUAGE } from "@/lib/constants";

interface QueueStatusProps {
  state: QueueState;
  className?: string;
}

export function QueueStatus({ state, className }: QueueStatusProps) {
  const statusConfig = {
    triaging: {
      icon: Loader2,
      label: `${LANGUAGE.QUEUE.TRIAGING} (${state.pendingCount} pending)`,
      className: "text-primary",
      iconClassName: "animate-spin",
    },
    up_to_date: {
      icon: CheckCircle2,
      label: LANGUAGE.QUEUE.UP_TO_DATE,
      className: "text-clear",
      iconClassName: "",
    },
    degraded: {
      icon: AlertTriangle,
      label: LANGUAGE.QUEUE.DEGRADED,
      className: "text-warning",
      iconClassName: "",
    },
  };
  
  const config = statusConfig[state.status];
  const Icon = config.icon;
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Icon className={cn("w-4 h-4", config.className, config.iconClassName)} />
      <span className={cn("text-sm font-medium", config.className)}>
        {config.label}
      </span>
    </div>
  );
}
