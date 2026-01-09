import { cn } from "@/lib/utils";
import { RiskBucket } from "@/lib/types";

interface RiskScoreProps {
  score: number;
  bucket?: RiskBucket;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function RiskScore({ 
  score, 
  bucket,
  size = "md", 
  showLabel = false,
  className 
}: RiskScoreProps) {
  const formattedScore = score.toFixed(2);
  
  const sizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  };
  
  const getScoreColor = () => {
    if (bucket) {
      switch (bucket) {
        case "CRITICAL": return "text-critical";
        case "REVIEW": return "text-warning";
        case "CLEAR": return "text-clear";
      }
    }
    // Fallback based on score value
    if (score >= 0.85) return "text-critical";
    if (score >= 0.5) return "text-warning";
    return "text-clear";
  };
  
  return (
    <div className={cn("flex flex-col", className)}>
      {showLabel && (
        <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          Risk Score
        </span>
      )}
      <span className={cn("font-mono font-semibold", sizeClasses[size], getScoreColor())}>
        {formattedScore}
      </span>
    </div>
  );
}
