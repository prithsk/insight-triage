import { useState, useMemo, useEffect } from "react";
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
import {
  sortWorklist, targetStateOf, WORKLIST_TICK_MS,
  type SortField, type WorklistOrder,
} from "@/lib/worklistOrder";
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

type StatusFilter  = "ACTIVE" | "REVIEWED" | "ARCHIVED";

const bucketFilters: (RiskBucket | "ALL")[] = ["ALL", "CRITICAL", "REVIEW", "CLEAR"];
const sortOptions: { value: SortField; label: string }[] = [
  { value: "target",   label: "Time to target" },
  { value: "priority", label: "Priority"       },
  { value: "score",    label: "Score"          },
  { value: "time",     label: "Wait time"      },
  { value: "studyId",  label: "Study ID"       },
];

/**
 * What the direction toggle actually does, spelled out per field.
 *
 * A bare up/down arrow is what let a backwards worklist ship unnoticed: the
 * icon said "descending" and the list said "least urgent first" and nothing
 * connected the two. The control now states its own effect.
 */
const ORDER_LABELS: Record<SortField, Record<WorklistOrder, string>> = {
  target:   { "urgent-first": "Closest to target first", "relaxed-first": "Most slack first"   },
  priority: { "urgent-first": "Critical first",          "relaxed-first": "Clear first"        },
  score:    { "urgent-first": "Highest score first",     "relaxed-first": "Lowest score first" },
  time:     { "urgent-first": "Longest waiting first",   "relaxed-first": "Newest first"       },
  studyId:  { "urgent-first": "A → Z",                   "relaxed-first": "Z → A"              },
};

/**
 * One clock for the whole page, so the ordering and every row's countdown are
 * computed from the same instant and cannot disagree on screen.
 *
 * Interval rationale lives with the constant in `@/lib/worklistOrder`
 * (WORKLIST_TICK_MS): 30s is below the row display's own resolution, and it
 * bounds how often rows can reorder under a radiologist's cursor.
 */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

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
  // Default: proximity to the read-time target, most urgent first. That is the
  // product's thesis — not arrival, and not score alone.
  const [sortField,      setSortField]      = useState<SortField>("target");
  const [order,          setOrder]          = useState<WorklistOrder>("urgent-first");

  const now = useNow(WORKLIST_TICK_MS);

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
  // Recomputed on each tick of the page clock, same as the ordering.
  const overTargetCount = useMemo(
    () => activeItems.filter(i => targetStateOf(i, now)?.over).length,
    [activeItems, now]
  );

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

    // The one ordering authority. `useRealTimeStudies` no longer sorts, so
    // nothing here depends on JS sort stability or on the order Postgres
    // happened to return.
    return sortWorklist(filtered, { field: sortField, order, now });
  }, [worklistItems, statusFilter, search, bucketFilter, sortField, order, now, activeItems, reviewedItems, archivedItems]);

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
            <h2 className="font-display text-[24px] text-kx-ink mb-2">Failed to load studies</h2>
            <p className="text-[15px] text-kx-muted">{error.message}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-72px)]">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <section className="px-8 py-7 border-b border-kx-border bg-white">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-display text-[24px] leading-[1.2] text-kx-ink tracking-[-0.015em]">
                  Worklist
                </h1>
                <p className="text-[13.5px] text-kx-muted mt-1.5 max-w-2xl leading-relaxed">
                  Worklist for respiratory imaging, ordered by{" "}
                  <em>proximity to read-time target</em>. Targets are Kroix defaults,
                  not your department&rsquo;s SLA, and elapsed time is measured from upload.
                </p>
              </div>
              <UploadButton />
            </div>

            {/* Queue + bucket stats */}
            <div className="flex items-center gap-8 mt-8">
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-kx-muted uppercase tracking-wide">Queue</span>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-kx-accent3/10 text-kx-accent3 rounded-lg text-[13px] font-medium">
                  <span className="w-2 h-2 rounded-full bg-kx-accent3 animate-pulse" />
                  {queueState.status === "triaging" ? "Triaging" : "Up to date"}
                </div>
              </div>
              <div className="h-6 w-px bg-kx-border" />
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-2 text-[14px] text-kx-muted">
                  <span className="w-2.5 h-2.5 rounded-full bg-kx-critical" />
                  {criticalCount} Critical
                </span>
                <span className="flex items-center gap-2 text-[14px] text-kx-muted">
                  <span className="w-2.5 h-2.5 rounded-full bg-kx-warn" />
                  {reviewCount} Review
                </span>
                <span className="flex items-center gap-2 text-[14px] text-kx-muted">
                  <span className="w-2.5 h-2.5 rounded-full bg-kx-accent3" />
                  {clearCount} Clear
                </span>
                {pendingCount > 0 && (
                  <span
                    className="flex items-center gap-2 text-[14px] text-kx-muted"
                    title="Awaiting triage. These have no acuity band yet, so they have no read-time target and sort below every scored study."
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-kx-muted" />
                    {pendingCount} Pending
                  </span>
                )}
                {overTargetCount > 0 && (
                  <span
                    className="flex items-center gap-2 text-[14px] font-medium text-kx-critical"
                    title="Past the Kroix default read-time target for their band — not your department's SLA. Elapsed is measured from upload time."
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-kx-critical" />
                    {overTargetCount} Over target
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Status Tabs ──────────────────────────────────────────────────── */}
        <section className="px-8 pt-4 pb-0 bg-white">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex items-center gap-1 border-b border-kx-border">
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
                        ? "border-kx-accent3 text-kx-accent3"
                        : "border-transparent text-kx-muted hover:text-kx-ink"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    <span className={cn(
                      "text-[11px] font-mono px-1.5 py-0.5 rounded-full",
                      isActive
                        ? "bg-kx-accent3/15 text-kx-accent3"
                        : "bg-kx-surface text-kx-muted"
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
        <section className="px-8 py-3 bg-kx-surface/50 border-b border-kx-border">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {/* Bucket filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-kx-muted" />
                <div className="flex gap-1">
                  {bucketFilters.map(f => (
                    <button
                      key={f}
                      onClick={() => setBucketFilter(f)}
                      className={cn(
                        "px-3 py-1.5 rounded-[8px] font-mono text-[13px] font-medium transition-colors",
                        bucketFilter === f
                          ? "bg-kx-accent3 text-white"
                          : "bg-kx-surface text-kx-muted hover:bg-kx-accent3/15 hover:text-kx-accent3"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-6 w-px bg-kx-border" />

              {/* Sort */}
              <div className="flex items-center gap-1">
                <Select value={sortField} onValueChange={v => setSortField(v as SortField)}>
                  <SelectTrigger className="w-[160px] h-9 text-[13px] border-kx-border rounded-lg bg-white text-kx-muted">
                    <ArrowUpDown className="w-3 h-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-kx-border z-50">
                    {sortOptions.map(o => (
                      <SelectItem key={o.value} value={o.value} className="text-[13px]">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* The toggle names its own effect. An unlabelled arrow is how a
                    backwards worklist shipped without anyone noticing. */}
                <button
                  onClick={() => setOrder(p => p === "urgent-first" ? "relaxed-first" : "urgent-first")}
                  title={`Sorted: ${ORDER_LABELS[sortField][order]}. Click to reverse.`}
                  aria-label={`Sort order: ${ORDER_LABELS[sortField][order]}. Click to reverse.`}
                  className="h-9 flex items-center gap-1.5 px-2.5 rounded-lg border border-kx-border bg-white text-[13px] text-kx-muted hover:bg-kx-accent3/10 hover:text-kx-accent3 transition-colors whitespace-nowrap"
                >
                  {order === "urgent-first" ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                  {ORDER_LABELS[sortField][order]}
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kx-muted" />
              <Input
                placeholder="Search by Study ID or Patient..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 bg-white/70 border-kx-border text-kx-ink placeholder:text-kx-muted h-10 rounded-[10px] focus:border-kx-accent3"
              />
            </div>

            {/* Bulk actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-6 w-px bg-kx-border" />
                <span className="text-[13px] text-kx-muted">{selectedIds.size} selected</span>

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
                  <AlertDialogContent className="bg-white border-kx-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-display text-[20px]">Archive {selectedIds.size} {selectedIds.size === 1 ? "study" : "studies"}?</AlertDialogTitle>
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
                  <AlertDialogContent className="bg-white border-kx-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-display text-[20px]">Delete {selectedIds.size} {selectedIds.size === 1 ? "study" : "studies"}?</AlertDialogTitle>
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
                <Loader2 className="w-8 h-8 animate-spin text-kx-accent3" />
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
                    <div className="rounded-lg border border-kx-border bg-white overflow-hidden">
                      {filteredAndSortedItems.map(item => (
                        <WorklistCard
                          key={item.study.id}
                          item={item}
                          now={now}
                          isSelected={selectedItem?.study.id === item.study.id}
                          isChecked={selectedIds.has(item.study.id)}
                          isMinimized={!!selectedItem}
                          onSelect={() => setSelectedItem(
                            selectedItem?.study.id === item.study.id ? null : item
                          )}
                          onCheck={checked => {
                            setSelectedIds(prev => {
                              const next = new Set(prev);
                              if (checked) next.add(item.study.id);
                              else next.delete(item.study.id);
                              return next;
                            });
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 rounded-2xl bg-white/60 flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-kx-muted" />
                      </div>
                      <h3 className="font-display text-[20px] text-kx-ink mb-2">
                        {worklistItems.length === 0 ? "No studies yet" : "No matching studies"}
                      </h3>
                      <p className="text-[15px] text-kx-muted">
                        {worklistItems.length === 0
                          ? "Upload a DICOM study to get started"
                          : "Try adjusting your filters or switching tabs"}
                      </p>
                    </div>
                  )}

                  {filteredAndSortedItems.length > 0 && (
                    <div className="mt-6 text-[13px] text-kx-muted">
                      Showing {filteredAndSortedItems.length} of {worklistItems.length} studies
                    </div>
                  )}
                </div>

                {/* Preview panel */}
                {selectedItem && (
                  <div className="hidden lg:block animate-slide-in">
                    <div className="sticky top-[88px] bg-white rounded-2xl border border-kx-border max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-clinical shadow-sm">
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
