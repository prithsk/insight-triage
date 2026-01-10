import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudies, StudyWithTriage } from "./useStudies";
import { WorklistItem, QueueState } from "@/lib/types";

export function useRealTimeStudies() {
  const queryClient = useQueryClient();
  const { data: studies, isLoading, error } = useStudies();
  const [queueState, setQueueState] = useState<QueueState>({
    status: "up_to_date",
    pendingCount: 0,
    lastUpdated: new Date()
  });

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('studies-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'studies'
        },
        () => {
          // Invalidate and refetch studies when any change occurs
          queryClient.invalidateQueries({ queryKey: ['studies'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'triage_results'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['studies'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lab_results'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['studies'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Calculate queue state from studies
  useEffect(() => {
    if (studies) {
      const pendingCount = studies.filter(
        s => s.status === 'PENDING' || s.status === 'QUEUED' || s.status === 'PROCESSING'
      ).length;
      
      setQueueState({
        status: pendingCount > 5 ? 'triaging' : pendingCount > 0 ? 'triaging' : 'up_to_date',
        pendingCount,
        lastUpdated: new Date()
      });
    }
  }, [studies]);

  // Transform database studies to WorklistItems
  const worklistItems: WorklistItem[] = (studies || []).map((study: StudyWithTriage) => {
    const latestTriage = study.triage_results?.[0] || null;
    const latestLab = study.lab_results?.[0] || null;

    return {
      study: {
        id: study.id,
        patient_hash: study.patient_hash,
        study_time: study.study_time,
        modality: study.modality,
        file_path: study.file_path,
        thumbnail_path: study.thumbnail_path,
        status: study.status,
        site_id: study.site_id,
        created_at: study.created_at,
        updated_at: study.updated_at
      },
      triage: latestTriage ? {
        id: latestTriage.id,
        study_id: latestTriage.study_id,
        risk_score: Number(latestTriage.risk_score),
        risk_bucket: latestTriage.risk_bucket,
        confidence: Number(latestTriage.confidence),
        roi_heatmap_path: latestTriage.roi_heatmap_path,
        model_version: latestTriage.model_version,
        inference_time_ms: latestTriage.inference_time_ms,
        created_at: latestTriage.created_at
      } : null,
      labs: latestLab ? {
        id: latestLab.id,
        study_id: latestLab.study_id,
        co2: latestLab.co2 ? Number(latestLab.co2) : null,
        ph: latestLab.ph ? Number(latestLab.ph) : null,
        o2: latestLab.o2 ? Number(latestLab.o2) : null,
        wbc: latestLab.wbc ? Number(latestLab.wbc) : null,
        crp: latestLab.crp ? Number(latestLab.crp) : null,
        procalcitonin: latestLab.procalcitonin ? Number(latestLab.procalcitonin) : null,
        source: latestLab.source,
        timestamp: latestLab.timestamp
      } : null
    };
  });

  // Sort by risk: CRITICAL first, then REVIEW, then CLEAR, then pending
  const sortedItems = [...worklistItems].sort((a, b) => {
    const bucketOrder = { CRITICAL: 0, REVIEW: 1, CLEAR: 2 };
    const aBucket = a.triage?.risk_bucket;
    const bBucket = b.triage?.risk_bucket;
    
    if (!aBucket && !bBucket) return 0;
    if (!aBucket) return 1;
    if (!bBucket) return -1;
    
    return bucketOrder[aBucket] - bucketOrder[bBucket];
  });

  return {
    worklistItems: sortedItems,
    queueState,
    isLoading,
    error
  };
}
