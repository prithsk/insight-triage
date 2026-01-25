import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { WorklistCard } from "@/components/dashboard/WorklistCard";
import { StudyPreview } from "@/components/dashboard/StudyPreview";
import { UploadButton } from "@/components/dashboard/UploadButton";
import { useRealTimeStudies } from "@/hooks/useRealTimeStudies";
import { WorklistItem, RiskBucket } from "@/lib/types";
import { Loader2, Search, Filter, Trash2, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDeleteStudy } from "@/hooks/useStudies";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortField = "priority" | "score" | "time" | "studyId";
type SortDirection = "asc" | "desc";

const bucketFilters: (RiskBucket | "ALL")[] = ["ALL", "CRITICAL", "REVIEW", "CLEAR"];
const sortOptions: { value: SortField; label: string }[] = [
  { value: "priority", label: "Priority" },
  { value: "score", label: "Score" },
  { value: "time", label: "Time" },
  { value: "studyId", label: "Study ID" },
];

export default function Index() {
  const { worklistItems, queueState, isLoading, error } = useRealTimeStudies();
  const [selectedItem, setSelectedItem] = useState<WorklistItem | null>(null);
  const [search, setSearch] = useState("");
  const [bucketFilter, setBucketFilter] = useState<RiskBucket | "ALL">("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortField, setSortField] = useState<SortField>("priority");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const deleteStudy = useDeleteStudy();

  const filteredAndSortedItems = useMemo(() => {
    const filtered = worklistItems.filter(item => {
      const matchesSearch = 
        item.study.id.toLowerCase().includes(search.toLowerCase()) ||
        item.study.patient_hash.toLowerCase().includes(search.toLowerCase());
      const matchesBucket = bucketFilter === "ALL" || item.triage?.risk_bucket === bucketFilter;
      return matchesSearch && matchesBucket;
    });

    const bucketOrder = { CRITICAL: 0, REVIEW: 1, CLEAR: 2 };
    
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "priority": {
          const aBucket = a.triage?.risk_bucket;
          const bBucket = b.triage?.risk_bucket;
          if (!aBucket && !bBucket) comparison = 0;
          else if (!aBucket) comparison = 1;
          else if (!bBucket) comparison = -1;
          else comparison = bucketOrder[aBucket] - bucketOrder[bBucket];
          break;
        }
        case "score": {
          const aScore = a.triage?.risk_score ?? -1;
          const bScore = b.triage?.risk_score ?? -1;
          comparison = aScore - bScore;
          break;
        }
        case "time": {
          const aTime = new Date(a.study.study_time).getTime();
          const bTime = new Date(b.study.study_time).getTime();
          comparison = aTime - bTime;
          break;
        }
        case "studyId": {
          comparison = a.study.id.localeCompare(b.study.id);
          break;
        }
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [worklistItems, search, bucketFilter, sortField, sortDirection]);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setIsDeleting(true);
    const idsToDelete = Array.from(selectedIds);
    let successCount = 0;
    let failCount = 0;

    for (const id of idsToDelete) {
      try {
        await deleteStudy.mutateAsync(id);
        successCount++;
      } catch {
        failCount++;
      }
    }

    setIsDeleting(false);
    setSelectedIds(new Set());
    
    if (failCount === 0) {
      toast.success(`Deleted ${successCount} ${successCount === 1 ? 'study' : 'studies'}`);
    } else {
      toast.warning(`Deleted ${successCount}, failed ${failCount}`);
    }
    
    setSelectedItem(null);
  };

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === "asc" ? "desc" : "asc");
  };

  const criticalCount = worklistItems.filter(i => i.triage?.risk_bucket === "CRITICAL").length;
  const reviewCount = worklistItems.filter(i => i.triage?.risk_bucket === "REVIEW").length;
  const clearCount = worklistItems.filter(i => i.triage?.risk_bucket === "CLEAR").length;
  const pendingCount = worklistItems.filter(i => !i.triage).length;
  
  if (error) {
    return (
      <DashboardLayout>
        <div className="min-h-[calc(100vh-72px)] flex items-center justify-center px-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="font-serif text-[24px] text-landing-heading mb-2">Failed to load studies</h2>
            <p className="text-[15px] text-landing-body">{error.message}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-72px)]">
        {/* Page Header */}
        <section className="px-8 py-10 border-b border-[rgba(0,0,0,0.06)]">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-serif text-[40px] lg:text-[48px] leading-[1.1] text-landing-heading tracking-[-0.01em]">
                  Triage <span className="text-landing-primary">Command Center</span>
                </h1>
                <p className="text-[17px] text-landing-body mt-3 max-w-xl">
                  Priority-sorted worklist for respiratory imaging. AI-powered triage puts <em>critical cases</em> first.
                </p>
              </div>
              
              <UploadButton />
            </div>
            
            {/* Stats Row */}
            <div className="flex items-center gap-8 mt-8">
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-landing-muted uppercase tracking-wide">Queue</span>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-landing-primary/10 text-landing-primary rounded-lg text-[13px] font-medium">
                  <span className="w-2 h-2 rounded-full bg-landing-primary animate-pulse" />
                  {queueState.status === "triaging" ? "Triaging" : "Up to date"}
                </div>
              </div>
              
              <div className="h-6 w-px bg-[rgba(0,0,0,0.08)]" />
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-[14px] text-landing-body">{criticalCount} Critical</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-[14px] text-landing-body">{reviewCount} Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[14px] text-landing-body">{clearCount} Clear</span>
                </div>
                {pendingCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-landing-muted" />
                    <span className="text-[14px] text-landing-body">{pendingCount} Pending</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
        
        {/* Filters Bar */}
        <section className="px-8 py-4 bg-white border-b border-[rgba(0,0,0,0.06)]">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-6">
            {/* Filters & Sort - Left side */}
            <div className="flex items-center gap-4">
              {/* Bucket filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-landing-muted" />
                <div className="flex gap-1">
                  {bucketFilters.map(filter => (
                    <button
                      key={filter}
                      onClick={() => setBucketFilter(filter)}
                      className={cn(
                        "px-3 py-1.5 rounded-[8px] font-mono text-[13px] font-medium transition-colors",
                        bucketFilter === filter 
                          ? "bg-landing-primary text-white" 
                          : "bg-landing-bg text-landing-body hover:bg-landing-primary/15 hover:text-landing-primary"
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="h-6 w-px bg-[rgba(0,0,0,0.08)]" />
              
              {/* Sort */}
              <div className="flex items-center gap-1">
                <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                  <SelectTrigger className="w-[120px] h-9 text-[13px] border-[rgba(0,0,0,0.06)] rounded-lg bg-white text-landing-body hover:border-landing-primary/50 hover:bg-landing-primary/5 transition-colors">
                    <ArrowUpDown className="w-3 h-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[rgba(0,0,0,0.06)] z-50">
                    {sortOptions.map(option => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value} 
                        className="text-[13px] text-landing-body hover:bg-landing-primary/10 hover:text-landing-primary focus:bg-landing-primary/10 focus:text-landing-primary cursor-pointer"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={toggleSortDirection}
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-[rgba(0,0,0,0.06)] bg-white text-landing-body hover:bg-landing-primary/10 hover:text-landing-primary hover:border-landing-primary/30 transition-colors"
                  title={sortDirection === "asc" ? "Ascending" : "Descending"}
                >
                  {sortDirection === "asc" ? (
                    <ArrowUp className="w-4 h-4" />
                  ) : (
                    <ArrowDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Search - Right side */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-landing-muted" />
              <Input
                placeholder="Search by Study ID or Patient..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-landing-bg/50 border-[rgba(0,0,0,0.06)] text-landing-heading placeholder:text-landing-muted h-10 rounded-[10px] hover:border-landing-primary focus:border-landing-primary focus-visible:ring-landing-primary/20"
              />
            </div>
            
            {/* Bulk delete */}
            {selectedIds.size > 0 && (
              <>
                <div className="h-6 w-px bg-[rgba(0,0,0,0.08)]" />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button 
                      className="px-3 py-1.5 rounded-lg text-[13px] font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1.5"
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete {selectedIds.size}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white border-[rgba(0,0,0,0.06)]">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-serif text-[20px]">
                        Delete {selectedIds.size} {selectedIds.size === 1 ? 'study' : 'studies'}?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-landing-body">
                        This will permanently delete the selected studies and all associated data. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-[10px]">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700 rounded-[10px]">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </section>
        
        {/* Main Content */}
        <section className="px-8 py-8">
          <div className="max-w-[1600px] mx-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-landing-primary" />
              </div>
            ) : (
              <div className={cn(
                "grid gap-6 transition-all duration-300",
                selectedItem ? "lg:grid-cols-2" : "grid-cols-1"
              )}>
                {/* Worklist Grid */}
                <div className={cn(
                  "transition-all duration-300",
                  selectedItem && "max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-clinical pr-2"
                )}>
                  {filteredAndSortedItems.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {filteredAndSortedItems.map(item => (
                        <WorklistCard
                          key={item.study.id}
                          item={item}
                          isSelected={selectedItem?.study.id === item.study.id}
                          isChecked={selectedIds.has(item.study.id)}
                          isMinimized={!!selectedItem}
                          onSelect={() => setSelectedItem(
                            selectedItem?.study.id === item.study.id ? null : item
                          )}
                          onCheck={(checked) => {
                            setSelectedIds(prev => {
                              const next = new Set(prev);
                              if (checked) {
                                next.add(item.study.id);
                              } else {
                                next.delete(item.study.id);
                              }
                              return next;
                            });
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 rounded-2xl bg-landing-bg flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-landing-muted" />
                      </div>
                      <h3 className="font-serif text-[20px] text-landing-heading mb-2">
                        {worklistItems.length === 0 ? "No studies yet" : "No matching studies"}
                      </h3>
                      <p className="text-[15px] text-landing-body">
                        {worklistItems.length === 0 
                          ? "Upload a DICOM study to get started" 
                          : "Try adjusting your filters"
                        }
                      </p>
                    </div>
                  )}
                  
                  {/* Footer */}
                  {filteredAndSortedItems.length > 0 && (
                    <div className="mt-6 text-[13px] text-landing-muted">
                      Showing {filteredAndSortedItems.length} of {worklistItems.length} studies
                    </div>
                  )}
                </div>
                
                {/* Preview Panel - Only shown when study is selected */}
                {selectedItem && (
                  <div className="hidden lg:block animate-slide-in">
                    <div className="sticky top-[88px] bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-clinical">
                      <StudyPreview item={selectedItem} onDeleted={() => setSelectedItem(null)} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
