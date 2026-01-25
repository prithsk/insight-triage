import { cn } from "@/lib/utils";
import { RiskBucket } from "@/lib/types";

interface BucketBadgeProps {
  bucket: RiskBucket;
  size?: "sm" | "md" | "lg";
  className?: string;
  showDot?: boolean;
}

export function BucketBadge({ bucket, size = "md", className, showDot = true }: BucketBadgeProps) {
  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  };

  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  };

  const bucketStyles = {
    CRITICAL: "bg-critical/20 text-critical border-critical/30",
    REVIEW: "bg-warning/20 text-warning border-warning/30",
    CLEAR: "bg-clear/20 text-clear border-clear/30",
  };

  const dotColors = {
    CRITICAL: "bg-critical",
    REVIEW: "bg-warning",
    CLEAR: "bg-clear",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold rounded-full uppercase tracking-wider border",
        sizeClasses[size],
        bucketStyles[bucket],
        className
      )}
    >
      {showDot && (
        <span className={cn("rounded-full", dotSizes[size], dotColors[bucket])} />
      )}
      {bucket}
    </span>
  );
}
