import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { WorklistTable } from "@/components/dashboard/WorklistTable";
import { PreviewPanel } from "@/components/dashboard/PreviewPanel";
import { UploadButton } from "@/components/dashboard/UploadButton";
import { QueueStatus } from "@/components/ui/queue-status";
import { useRealTimeStudies } from "@/hooks/useRealTimeStudies";
import { WorklistItem } from "@/lib/types";
import { Loader2 } from "lucide-react";

export default function Index() {
  const { worklistItems, queueState, isLoading, error } = useRealTimeStudies();
  const [selectedItem, setSelectedItem] = useState<WorklistItem | null>(null);
  
  if (error) {
    return (
      <AppLayout>
        <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
          <div className="text-center">
            <p className="text-destructive text-lg">Failed to load studies</p>
            <p className="text-muted-foreground text-sm mt-2">{error.message}</p>
          </div>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <div className="h-[calc(100vh-3.5rem)] flex flex-col">
        {/* Page Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-surface/50 backdrop-blur-sm">
          <div>
            <h1 className="text-2xl font-serif font-semibold tracking-tight">Triage Command Center</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Priority-sorted worklist • {worklistItems.length} studies
            </p>
          </div>

          <div className="flex items-center gap-4">
            <QueueStatus state={queueState} />
            <UploadButton />
          </div>
        </div>
        
        {/* Main Content - Two Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Worklist (45%) */}
          <div className="w-[45%] border-r border-white/5 bg-surface/30 backdrop-blur-sm">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <WorklistTable
                items={worklistItems}
                selectedId={selectedItem?.study.id ?? null}
                onSelect={setSelectedItem}
                onBulkDeleted={() => setSelectedItem(null)}
              />
            )}
          </div>

          {/* Right: Preview Panel (55%) */}
          <div className="flex-1 bg-background/50 overflow-auto">
            <PreviewPanel item={selectedItem} onDeleted={() => setSelectedItem(null)} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
