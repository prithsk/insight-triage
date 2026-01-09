import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { WorklistTable } from "@/components/dashboard/WorklistTable";
import { PreviewPanel } from "@/components/dashboard/PreviewPanel";
import { UploadButton } from "@/components/dashboard/UploadButton";
import { QueueStatus } from "@/components/ui/queue-status";
import { generateMockWorklistItems, mockQueueState } from "@/lib/mock-data";
import { WorklistItem } from "@/lib/types";

export default function Index() {
  const worklistItems = useMemo(() => generateMockWorklistItems(20), []);
  const [selectedItem, setSelectedItem] = useState<WorklistItem | null>(null);
  
  return (
    <AppLayout>
      <div className="h-[calc(100vh-3.5rem)] flex flex-col">
        {/* Page Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div>
            <h1 className="text-xl font-semibold">Triage Command Center</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Priority-sorted worklist • {worklistItems.length} studies
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <QueueStatus state={mockQueueState} />
            <UploadButton />
          </div>
        </div>
        
        {/* Main Content - Two Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Worklist (40%) */}
          <div className="w-[45%] border-r border-border bg-surface">
            <WorklistTable
              items={worklistItems}
              selectedId={selectedItem?.study.id ?? null}
              onSelect={setSelectedItem}
            />
          </div>
          
          {/* Right: Preview Panel (60%) */}
          <div className="flex-1 bg-background overflow-auto">
            <PreviewPanel item={selectedItem} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
