import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { WorklistCard } from "@/components/dashboard/WorklistCard";
import { StudyPreview } from "@/components/dashboard/StudyPreview";
import { UploadButton } from "@/components/dashboard/UploadButton";
import { useRealTimeStudies } from "@/hooks/useRealTimeStudies";
import { WorklistItem, RiskBucket } from "@/lib/types";
import {
  Loader2, Search, Filter, Trash2, Archive,
  ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle,
  CheckCircle2, Clock, FolderArchive,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDeleteStudy, useArchiveStudies } from "@/hooks/useStudies";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";

type SortField     = "priority" | "score" | "time" | "studyId";
type SortDirection = "asc" | "desc";
type StatusFilter  = "ACTIVE" | "REVIEWED" | "ARCHIVED";

const bucketFilters: (RiskBucket | "ALL")[] = ["ALL", "CRITICAL", "REVIEW", "CLEAR"];
const sortOptions: { value: SortField; label: string }[] = [
  { value: "priority", label: "Priority" },
  { value: "score",    label: "Score"    },
  { value: "time",     label: "Time"     },
  { value: "studyId",  label: "Study ID" },
];

const STATUS_TABS: { id: StatusFilter; label: string; icon: typeof Clock }[] = [
  { id: "ACTIVE",   label: "Active",   icon: Clock        },
  { id: "REVIEWED", label: "Reviewed", icon: CheckCircle2 },
  { id: "ARCHIVED", label: "Archived", icon: FolderArchive },
];

export default function Index() {
  const { worklistItems, queueState, isLoading, error } = useRealTimeStudies();
  const [selectedItem,   setSelectedItem]   = useState<WorklistItem | null>(null);
  const [search,         setSearch]         = useState("");
  const [bucketFilter,   setBucketFilter]   = useState<RiskBucket | "ALL">("ALL");
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>("ACTIVE");
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set());
  const [isDeleting,     setIsDeleting]     = useState(false);
  const [isArchiving,    setIsArchiving]    = useState(false);
  const [sortField,      setSortField]      = useState<SortField>("priority");
  const [sortDirection,  setSortDirection]  = useState<SortDirection>("desc");

  const deleteStudy  = useDeleteStudy();
  const archiveStudies = useArchiveStudies();

  // ── Status bucket counts ──────────────────────────────────────────────────
  const activeItems   = useMemo(() => worklistItems.filter(i => !["REVIEWED","ARCHIVED"].includes(i.study.status)), [worklistItems]);
  const reviewedItems = useMemo(() => worklistItems.filter(i => i.study.status === "REVIEWED"),  [worklistItems]);
  const archivedItems = useMemo(() => worklistItems.filter(i => i.study.status === "ARCHIVED"),  [worklistItems]);

  const criticalCount = activeItems.filter(i => i.triage?.risk_bucket === "CRITICAL").length;
  const reviewCount   = activeItems.filter(i => i.triage?.risk_bucket === "REVIEW").length;
  const clearCount    = activeItems.filter(i => i.triage?.risk_bucket === "CLEAR").length;
  const pendingCount  = activeItems.filter(i => !i.triage).length;

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filteredAndSortedItems = useMemo(() => {
    const pool = statusFilter === "ACTIVE"
      ? activeItems
      : statusFilter === "REVIEWED"
      ? reviewedItems
      : archivedItems;

    const filtered = pool.filter(item => {
      const matchesSearch =
        item.study.id.toLowerCase().includes(search.toLowerCase()) ||
        item.study.patient_hash.toLowerCase().includes(search.toLowerCase());
      const matchesBucket = bucketFilter === "ALL" || item.triage?.risk_bucket === bucketFilter;
      return matchesSearch && matchesBucket;
    });

    const bucketOrder = { CRITICAL: 0, REVIEW: 1, CLEAR: 2 };
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "priority": {
          const ab = a.triage?.risk_bucket, bb = b.triage?.risk_bucket;
          if (!ab && !bb) cmp = 0;
          else if (!ab) cmp = 1;
          else if (!bb) cmp = -1;
          else cmp = bucketOrder[ab] - bucketOrder[bb];
          break;
        }
        case "score":   cmp = (a.triage?.risk_score ?? -1) - (b.triage?.risk_score ?? -1); break;
        case "time":    cmp = new Date(a.study.study_time).getTime() - new Date(b.study.study_time).getTime(); break;
        case "studyId": cmp = a.study.id.localeCompare(b.study.id); break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [worklistItems, statusFilter, search, bucketFilter, sortField, sortDirection, activeItems, reviewedItems, archivedItems]);

  // ── Bulk actions ──────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    setIsDeleting(true);
    let ok = 0, fail = 0;
    for (const id of selectedIds) {
      try { await deleteStudy.mutateAsync(id); ok++; }
      catch { fail++; }
    }
    setIsDeleting(false);
    setSelectedIds(new Set());
    setSelectedItem(null);
    if (!fail) toast.success(`Deleted ${ok} ${ok === 1 ? "study" : "studies"}`);
    else toast.warning(`Deleted ${ok}, failed ${fail}`);
  };

  const handleBulkArchive = async () => {
    if (!selectedIds.size) return;
    setIsArchiving(true);
    await archiveStudies.mutateAsync(Array.from(selectedIds));
    setIsArchiving(false);
    setSelectedIds(new Set());
    setSelectedItem(null);
  };

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

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <section className="px-8 py-10 border-b border-[rgba(0,0,0,0.06)] bg-white/40 backdrop-blur-sm">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-serif text-[40px] lg:text-[48px] leading-[1.1] text-landing-heading tracking-[-0.01em]">
                  Triage <span className="text-landing-primary">Command Center</span>
                </h1>
                <p className="text-[17px] text-landing-body mt-3 max-w-xl">
                  Priority-sorted worklist for respiratory imaging. AI-powered triage puts{" "}
                  <em>critical cases</em> first.
                </p>
              </div>
              <UploadButton />
            </div>

            {/* Queue + bucket stats */}
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
                <span className="flex items-center gap-2 text-[14px] text-landing-body">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  {criticalCount} Critical
                </span>
                <span className="flex items-center gap-2 text-[14px] text-landing-body">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  {reviewCount} Review
                </span>
                <span className="flex items-center gap-2 text-[14px] text-landing-body">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  {clearCount} Clear
                </span>
                {pendingCount > 0 && (
                  <span className="flex items-center gap-2 text-[14px] text-landing-body">
                    <span className="w-2.5 h-2.5 rounded-full bg-landing-muted" />
                    {pendingCount} Pending
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Status Tabs ──────────────────────────────────────────────────── */}
        <section className="px-8 pt-5 pb-0 bg-white/30 backdrop-blur-sm">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex items-center gap-1 border-b border-[rgba(0,0,0,0.06)]">
              {STATUS_TABS.map(tab => {
                const count = tab.id === "ACTIVE" ? activeItems.length
                            : tab.id === "REVIEWED" ? reviewedItems.length
                            : archivedItems.length;
                const Icon = tab.icon;
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setStatusFilter(tab.id); setSelectedIds(new Set()); setSelectedItem(null); }}
                    className={cn(
                      "flex items-center gap-2 px-5 py-3 text-[14px] font-medium transition-all duration-150 border-b-2 -mb-px",
                      isActive
                        ? "border-landing-primary text-landing-primary"
                        : "border-transparent text-landing-body hover:text-landing-heading"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    <span className={cn(
                      "text-[11px] font-mono px-1.5 py-0.5 rounded-full",
                      isActive
                        ? "bg-landing-primary/15 text-landing-primary"
                        : "bg-landing-bg text-landing-muted"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Filters Bar ──────────────────────────────────────────────────── */}
        <section className="px-8 py-4 bg-white/60 backdrop-blur-sm border-b border-[rgba(0,0,0,0.06)]">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {/* Bucket filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-landing-muted" />
                <div className="flex gap-1">
                  {bucketFilters.map(f => (
                    <button
                      key={f}
                      onClick={() => setBucketFilter(f)}
                      className={cn(
                        "px-3 py-1.5 rounded-[8px] font-mono text-[13px] font-medium transition-colors",
                        bucketFilter === f
                          ? "bg-landing-primary text-white"
                          : "bg-landing-bg text-landing-body hover:bg-landing-primary/15 hover:text-landing-primary"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-6 w-px bg-[rgba(0,0,0,0.08)]" />

              {/* Sort */}
              <div className="flex items-center gap-1">
                <Select value={sortField} onValueChange={v => setSortField(v as SortField)}>
                  <SelectTrigger className="w-[120px] h-9 text-[13px] border-[rgba(0,0,0,0.06)] rounded-lg bg-white text-landing-body">
                    <ArrowUpDown className="w-3 h-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[rgba(0,0,0,0.06)] z-50">
                    {sortOptions.map(o => (
                      <SelectItem key={o.value} value={o.value} className="text-[13px]">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => setSortDirection(p => p === "asc" ? "desc" : "asc")}
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-[rgba(0,0,0,0.06)] bg-white text-landing-body hover:bg-landing-primary/10 hover:text-landing-primary transition-colors"
                >
                  {sortDirection === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-landing-muted" />
              <Input
                placeholder="Search by Study ID or Patient..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 bg-white/70 border-[rgba(0,0,0,0.06)] text-landing-heading placeholder:text-landing-muted h-10 rounded-[10px] focus:border-landing-primary"
              />
            </div>

            {/* Bulk actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-6 w-px bg-[rgba(0,0,0,0.08)]" />
                <span className="text-[13px] text-landing-muted">{selectedIds.size} selected</span>

                {/* Archive bulk */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      disabled={isArchiving}
                      className="px-3 py-1.5 rounded-lg text-[13px] font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors flex items-center gap-1.5"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      Archive
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white border-[rgba(0,0,0,0.06)]">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-serif text-[20px]">Archive {selectedIds.size} {selectedIds.size === 1 ? "study" : "studies"}?</AlertDialogTitle>
                      <AlertDialogDescription>Studies will be moved to the Archived tab. This can be reversed by contacting your admin.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-[10px]">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkArchive} className="bg-amber-600 hover:bg-amber-700 rounded-[10px]">Archive</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Delete bulk */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      disabled={isDeleting}
                      className="px-3 py-1.5 rounded-lg text-[13px] font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white border-[rgba(0,0,0,0.06)]">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-serif text-[20px]">Delete {selectedIds.size} {selectedIds.size === 1 ? "study" : "studies"}?</AlertDialogTitle>
                      <AlertDialogDescription>This permanently deletes the selected studies. Cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-[10px]">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700 rounded-[10px]">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </section>

        {/* ── Main Content ──────────────────────────────────────────────────── */}
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
                {/* Worklist */}
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
                          onCheck={checked => {
                            setSelectedIds(prev => {
                              const next = new Set(prev);
                              checked ? next.add(item.study.id) : next.delete(item.study.id);
                              return next;
                            });
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 rounded-2xl bg-white/60 flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-landing-muted" />
                      </div>
                      <h3 className="font-serif text-[20px] text-landing-heading mb-2">
                        {worklistItems.length === 0 ? "No studies yet" : "No matching studies"}
                      </h3>
                      <p className="text-[15px] text-landing-body">
                        {worklistItems.length === 0
                          ? "Upload a DICOM study to get started"
                          : "Try adjusting your filters or switching tabs"}
                      </p>
                    </div>
                  )}

                  {filteredAndSortedItems.length > 0 && (
                    <div className="mt-6 text-[13px] text-landing-muted">
                      Showing {filteredAndSortedItems.length} of {worklistItems.length} studies
                    </div>
                  )}
                </div>

                {/* Preview panel */}
                {selectedItem && (
                  <div className="hidden lg:block animate-slide-in">
                    <div className="sticky top-[88px] bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-clinical shadow-sm">
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
