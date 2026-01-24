import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type RiskBucket = 'CRITICAL' | 'REVIEW' | 'CLEAR';
export type StudyStatus = 'PENDING' | 'QUEUED' | 'PROCESSING' | 'REVIEWED' | 'ARCHIVED';
export type FeedbackType = 'CORRECT_PRIORITY' | 'FALSE_ALARM' | 'MISSED_URGENCY';

export interface Study {
  id: string;
  patient_hash: string;
  study_time: string;
  modality: string;
  file_path: string | null;
  thumbnail_path: string | null;
  status: StudyStatus;
  site_id: string;
  created_at: string;
  updated_at: string;
}

export interface TriageResult {
  id: string;
  study_id: string;
  risk_score: number;
  risk_bucket: RiskBucket;
  confidence: number;
  roi_heatmap_path: string | null;
  model_version: string;
  inference_time_ms: number | null;
  created_at: string;
}

export interface LabResult {
  id: string;
  study_id: string;
  co2: number | null;
  ph: number | null;
  o2: number | null;
  wbc: number | null;
  crp: number | null;
  procalcitonin: number | null;
  source: string;
  timestamp: string;
}

export interface StudyWithTriage extends Study {
  triage_results: TriageResult[];
  lab_results: LabResult[];
}

export function useStudies() {
  return useQuery({
    queryKey: ['studies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('studies')
        .select(`
          *,
          triage_results (*),
          lab_results (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StudyWithTriage[];
    }
  });
}

export function useStudy(studyId: string | undefined) {
  return useQuery({
    queryKey: ['study', studyId],
    queryFn: async () => {
      if (!studyId) return null;
      
      const { data, error } = await supabase
        .from('studies')
        .select(`
          *,
          triage_results (*),
          lab_results (*)
        `)
        .eq('id', studyId)
        .maybeSingle();

      if (error) throw error;
      return data as StudyWithTriage | null;
    },
    enabled: !!studyId
  });
}

export function useCreateStudy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (study: Partial<Study>) => {
      const { data, error } = await supabase
        .from('studies')
        .insert({
          patient_hash: study.patient_hash || `P${Date.now()}`,
          study_time: study.study_time || new Date().toISOString(),
          modality: study.modality || 'CXR',
          status: 'PENDING' as StudyStatus,
          site_id: study.site_id || 'pilot-1'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      toast.success('Study created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create study: ${error.message}`);
    }
  });
}

export function useRunInference() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (studyId: string) => {
      // Call the inference edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/infer-cxr`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({ study_id: studyId })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Inference failed');
      }

      const inferenceResult = await response.json();
      
      // Store the triage result in the database
      const { data, error } = await supabase
        .from('triage_results')
        .insert({
          study_id: studyId,
          risk_score: inferenceResult.risk_score,
          risk_bucket: inferenceResult.risk_bucket,
          confidence: inferenceResult.confidence,
          roi_heatmap_path: inferenceResult.roi_heatmap,
          model_version: inferenceResult.model_version,
          inference_time_ms: inferenceResult.inference_time_ms
        })
        .select()
        .single();

      if (error) throw error;
      
      // Update study status
      await supabase
        .from('studies')
        .update({ status: 'QUEUED' as StudyStatus })
        .eq('id', studyId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      toast.success('Inference completed');
    },
    onError: (error) => {
      toast.error(`Inference failed: ${error.message}`);
    }
  });
}

export function useSubmitFeedback() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      studyId, 
      triageResultId, 
      feedbackType, 
      notes 
    }: { 
      studyId: string; 
      triageResultId?: string; 
      feedbackType: FeedbackType; 
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('feedback_events')
        .insert({
          study_id: studyId,
          triage_result_id: triageResultId,
          feedback_type: feedbackType,
          notes
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      toast.success('Feedback submitted');
    },
    onError: (error) => {
      toast.error(`Failed to submit feedback: ${error.message}`);
    }
  });
}

export function useDeleteStudy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (studyId: string) => {
      // First, get the study to find the file path
      const { data: study, error: fetchError } = await supabase
        .from('studies')
        .select('file_path')
        .eq('id', studyId)
        .single();

      if (fetchError) throw fetchError;

      // Delete associated records first (due to foreign keys)
      await supabase.from('feedback_events').delete().eq('study_id', studyId);
      await supabase.from('triage_results').delete().eq('study_id', studyId);
      await supabase.from('lab_results').delete().eq('study_id', studyId);

      // Delete the study record
      const { error: deleteError } = await supabase
        .from('studies')
        .delete()
        .eq('id', studyId);

      if (deleteError) throw deleteError;

      // Delete the file from storage if it exists
      if (study?.file_path) {
        await supabase.storage
          .from('dicom-files')
          .remove([study.file_path]);
      }

      return studyId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      toast.success('Study deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete study: ${error.message}`);
    }
  });
}
