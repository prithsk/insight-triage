import { useState } from "react";
import { WorklistItem, RiskBucket } from "@/lib/types";
import { BucketBadge } from "@/components/ui/bucket-badge";
import { RiskScore } from "@/components/ui/risk-score";
import { LabFlags } from "@/components/ui/lab-flags";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";

interface WorklistTableProps {
  items: WorklistItem[];
  selectedId: string | null;
  onSelect: (item: WorklistItem) => void;
}

const bucketFilters: (RiskBucket | "ALL")[] = ["ALL", "CRITICAL", "REVIEW", "CLEAR"];

export function WorklistTable({ items, selectedId, onSelect }: WorklistTableProps) {
  const [search, setSearch] = useState("");
  const [bucketFilter, setBucketFilter] = useState<RiskBucket | "ALL">("ALL");
  
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.study.id.toLowerCase().includes(search.toLowerCase()) ||
      item.study.patient_hash.toLowerCase().includes(search.toLowerCase());
    const matchesBucket = bucketFilter === "ALL" || item.triage?.risk_bucket === bucketFilter;
    return matchesSearch && matchesBucket;
  });
  
  const getRowClasses = (item: WorklistItem, isSelected: boolean) => {
    const bucket = item.triage?.risk_bucket || "CLEAR";
    
    return cn(
      "group cursor-pointer transition-all duration-150",
      "border-l-4",
      bucket === "CRITICAL" && "border-l-critical",
      bucket === "REVIEW" && "border-l-warning",
      bucket === "CLEAR" && "border-l-clear",
      isSelected 
        ? "bg-primary/10 border-l-primary" 
        : "hover:bg-muted/50"
    );
  };

  const formatStudyTime = (timeStr: string) => {
    try {
      return format(parseISO(timeStr), "MMM d, HH:mm");
    } catch {
      return timeStr;
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-4 border-b border-border space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by Study ID or Patient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background border-border"
          />
        </div>
        
        {/* Bucket filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <div className="flex gap-1">
            {bucketFilters.map(filter => (
              <Button
                key={filter}
                variant={bucketFilter === filter ? "default" : "ghost"}
                size="sm"
                onClick={() => setBucketFilter(filter)}
                className={cn(
                  "text-xs h-7",
                  bucketFilter === filter && "bg-primary text-primary-foreground"
                )}
              >
                {filter}
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Table */}
      <div className="flex-1 overflow-auto scrollbar-clinical">
        <table className="w-full">
          <thead className="sticky top-0 bg-surface border-b border-border">
            <tr className="text-xs text-muted-foreground uppercase tracking-wider">
              <th className="text-left py-3 px-4 font-medium">Study ID</th>
              <th className="text-left py-3 px-4 font-medium">Time</th>
              <th className="text-left py-3 px-4 font-medium">Priority</th>
              <th className="text-left py-3 px-4 font-medium">Score</th>
              <th className="text-left py-3 px-4 font-medium">Labs</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => {
              const isSelected = item.study.id === selectedId;
              
              return (
                <tr
                  key={item.study.id}
                  onClick={() => onSelect(item)}
                  className={getRowClasses(item, isSelected)}
                >
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-mono text-sm font-medium">
                        {item.study.id.slice(0, 8)}...
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.study.patient_hash}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-muted-foreground">
                      {formatStudyTime(item.study.study_time)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {item.triage ? (
                      <BucketBadge bucket={item.triage.risk_bucket} size="sm" />
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Pending</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {item.triage && (
                      <RiskScore 
                        score={item.triage.risk_score} 
                        bucket={item.triage.risk_bucket}
                        size="sm" 
                      />
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <LabFlags labs={item.labs} compact />
                  </td>
                </tr>
              );
            })}
            
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <p className="text-muted-foreground">
                    {items.length === 0 
                      ? "No studies in database. Upload a study to get started." 
                      : "No studies match your filters"
                    }
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Footer count */}
      <div className="p-3 border-t border-border bg-surface">
        <span className="text-xs text-muted-foreground">
          {filteredItems.length} of {items.length} studies
        </span>
      </div>
    </div>
  );
}
