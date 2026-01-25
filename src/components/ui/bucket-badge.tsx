import { cn } from "@/lib/utils";
import { RiskBucket } from "@/lib/types";

interface BucketBadgeProps {
  bucket: RiskBucket;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function BucketBadge({ bucket, size = "md", className }: BucketBadgeProps) {
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1.5",
  };
  
  const bucketStyles = {
    CRITICAL: "bg-critical text-critical-foreground",
    REVIEW: "bg-warning text-warning-foreground",
    CLEAR: "bg-clear text-clear-foreground",
  };
  
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold rounded uppercase tracking-wider",
        sizeClasses[size],
        bucketStyles[bucket],
        className
      )}
    >
      {bucket}
    </span>
  );
}
