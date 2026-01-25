import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadResult {
  studyId: string;
  filePath: string;
  triageResult?: {
    risk_score: number;
    risk_bucket: string;
    confidence: number;
  };
}

export function useUploadDicom() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (file: File): Promise<UploadResult> => {
      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `uploads/${timestamp}_${sanitizedName}`;
      
      // 1. Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('dicom-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      // 2. Create study record
      const patientHash = `PAT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const { data: study, error: studyError } = await supabase
        .from('studies')
        .insert({
          patient_hash: patientHash,
          study_time: new Date().toISOString(),
          modality: 'CXR',
          file_path: filePath,
          status: 'PROCESSING',
          site_id: 'pilot-1'
        })
        .select()
        .single();
      
      if (studyError) {
        throw new Error(`Failed to create study: ${studyError.message}`);
      }
      
      // 3. Trigger ML inference
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/infer-cxr`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({ study_id: study.id })
        }
      );
      
      if (!response.ok) {
        // Update study status to error
        await supabase
          .from('studies')
          .update({ status: 'PENDING' })
          .eq('id', study.id);
        
        const error = await response.json();
        throw new Error(error.error || 'Inference failed');
      }
      
      const inferenceResult = await response.json();
      
      // 4. Store triage result
      const { error: triageError } = await supabase
        .from('triage_results')
        .insert({
          study_id: study.id,
          risk_score: inferenceResult.risk_score,
          risk_bucket: inferenceResult.risk_bucket,
          confidence: inferenceResult.confidence,
          roi_heatmap_path: inferenceResult.roi_heatmap,
          model_version: inferenceResult.model_version,
          inference_time_ms: inferenceResult.inference_time_ms
        });
      
      if (triageError) {
        console.error('Failed to store triage result:', triageError);
      }
      
      // 5. Generate and store lab fusion biomarkers based on risk bucket
      const riskBucket = inferenceResult.risk_bucket;
      const generateLabValues = () => {
        // Simulate lab values correlated with severity
        const isCritical = riskBucket === 'CRITICAL';
        const isReview = riskBucket === 'REVIEW';
        
        // CO2: Normal 35-45, abnormal <35 or >50
        const co2 = isCritical 
          ? Math.round(52 + Math.random() * 8) // 52-60 (high)
          : isReview
          ? Math.round(46 + Math.random() * 5) // 46-51 (slightly elevated)
          : Math.round(38 + Math.random() * 6); // 38-44 (normal)
        
        // pH: Normal 7.35-7.45, abnormal <7.35 or >7.45
        const ph = isCritical
          ? Number((7.25 + Math.random() * 0.08).toFixed(2)) // 7.25-7.33 (low)
          : isReview
          ? Number((7.32 + Math.random() * 0.05).toFixed(2)) // 7.32-7.37 (borderline)
          : Number((7.38 + Math.random() * 0.06).toFixed(2)); // 7.38-7.44 (normal)
        
        // O2 Saturation: Normal >94%, concerning <90%
        const o2 = isCritical
          ? Math.round(82 + Math.random() * 6) // 82-88 (low)
          : isReview
          ? Math.round(88 + Math.random() * 4) // 88-92 (borderline)
          : Math.round(95 + Math.random() * 4); // 95-99 (normal)
        
        // WBC: Normal 4-11, elevated >11
        const wbc = isCritical
          ? Number((14 + Math.random() * 8).toFixed(1)) // 14-22 (high)
          : isReview
          ? Number((11 + Math.random() * 4).toFixed(1)) // 11-15 (elevated)
          : Number((5 + Math.random() * 5).toFixed(1)); // 5-10 (normal)
        
        // CRP: Normal <3, elevated 3-10, high >10
        const crp = isCritical
          ? Number((15 + Math.random() * 35).toFixed(1)) // 15-50 (high)
          : isReview
          ? Number((5 + Math.random() * 10).toFixed(1)) // 5-15 (elevated)
          : Number((0.5 + Math.random() * 2).toFixed(1)); // 0.5-2.5 (normal)
        
        // Procalcitonin: Normal <0.1, bacterial infection >0.5
        const procalcitonin = isCritical
          ? Number((0.8 + Math.random() * 4).toFixed(2)) // 0.8-4.8 (high)
          : isReview
          ? Number((0.2 + Math.random() * 0.5).toFixed(2)) // 0.2-0.7 (borderline)
          : Number((0.02 + Math.random() * 0.08).toFixed(2)); // 0.02-0.1 (normal)
        
        return { co2, ph, o2, wbc, crp, procalcitonin };
      };
      
      const labValues = generateLabValues();
      
      const { error: labError } = await supabase
        .from('lab_results')
        .insert({
          study_id: study.id,
          co2: labValues.co2,
          ph: labValues.ph,
          o2: labValues.o2,
          wbc: labValues.wbc,
          crp: labValues.crp,
          procalcitonin: labValues.procalcitonin,
          source: 'lab_fusion_analysis',
          timestamp: new Date().toISOString()
        });
      
      if (labError) {
        console.error('Failed to store lab results:', labError);
      }
      
      // 6. Update study status to QUEUED
      await supabase
        .from('studies')
        .update({ status: 'QUEUED' })
        .eq('id', study.id);
      
      return {
        studyId: study.id,
        filePath,
        triageResult: {
          risk_score: inferenceResult.risk_score,
          risk_bucket: inferenceResult.risk_bucket,
          confidence: inferenceResult.confidence
        }
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      
      const bucketLabel = result.triageResult?.risk_bucket === 'CRITICAL' 
        ? '🔴 CRITICAL' 
        : result.triageResult?.risk_bucket === 'REVIEW'
        ? '🟡 REVIEW'
        : '🟢 CLEAR';
      
      toast.success(`Study uploaded and triaged: ${bucketLabel}`, {
        description: `Risk score: ${((result.triageResult?.risk_score || 0) * 100).toFixed(0)}%`
      });
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    }
  });
}

export function useUploadMultipleDicom() {
  const uploadDicom = useUploadDicom();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (files: File[]) => {
      const results: UploadResult[] = [];
      const errors: string[] = [];
      
      for (const file of files) {
        try {
          const result = await uploadDicom.mutateAsync(file);
          results.push(result);
        } catch (error) {
          errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      return { results, errors };
    },
    onSuccess: ({ results, errors }) => {
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      
      if (results.length > 0) {
        const criticalCount = results.filter(r => r.triageResult?.risk_bucket === 'CRITICAL').length;
        const reviewCount = results.filter(r => r.triageResult?.risk_bucket === 'REVIEW').length;
        
        let summary = `${results.length} study(ies) uploaded`;
        if (criticalCount > 0) summary += ` • ${criticalCount} CRITICAL`;
        if (reviewCount > 0) summary += ` • ${reviewCount} REVIEW`;
        
        toast.success(summary);
      }
      
      if (errors.length > 0) {
        toast.error(`${errors.length} upload(s) failed`, {
          description: errors[0]
        });
      }
    }
  });
}
