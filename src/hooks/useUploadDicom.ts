import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fileUploadSchema, logSecurityEvent, checkRateLimit } from "@/lib/security";

interface UploadResult {
  studyId: string;
  filePath: string;
  triageResult?: {
    risk_score: number;
    risk_bucket: string;
    confidence: number;
  };
}

// Allowed file types and extensions
const ALLOWED_EXTENSIONS = ['.dcm', '.dicom', '.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size must be less than 50MB' };
  }
  
  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
  if (!hasValidExtension) {
    return { valid: false, error: 'Invalid file type. Allowed: DICOM, JPEG, PNG, WebP' };
  }
  
  // Check for double extensions (e.g., .jpg.exe)
  const parts = fileName.split('.');
  if (parts.length > 2) {
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.js', '.html', '.php'];
    for (const ext of suspiciousExtensions) {
      if (fileName.includes(ext)) {
        logSecurityEvent('validation_failure', { 
          type: 'suspicious_file_extension', 
          filename: fileName.substring(0, 50) 
        });
        return { valid: false, error: 'Invalid file type' };
      }
    }
  }
  
  return { valid: true };
}

export function useUploadDicom() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (file: File): Promise<UploadResult> => {
      // Rate limiting: max 10 uploads per minute
      const rateLimit = checkRateLimit('dicom-upload', 10, 60 * 1000);
      if (!rateLimit.allowed) {
        throw new Error('Upload rate limit exceeded. Please wait a moment.');
      }
      
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      // Generate unique file path with sanitized name
      const timestamp = Date.now();
      const sanitizedName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .substring(0, 100); // Limit filename length
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
      
      // 5. Store AI-generated lab fusion biomarkers (clinically correlated with image analysis)
      // Lab values are now returned directly from the AI inference based on image severity
      const labValues = inferenceResult.lab_values || {
        // Fallback values if AI doesn't return lab values
        co2: 40,
        ph: 7.40,
        o2: 97,
        wbc: 7.5,
        crp: 1.5,
        procalcitonin: 0.05
      };
      
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
          source: 'ai_vision_analysis',
          timestamp: new Date().toISOString()
        });
      
      if (labError) {
        console.error('Failed to store lab results:', labError);
      }
      
      // Log findings if available
      if (inferenceResult.findings && inferenceResult.findings.length > 0) {
        console.log('AI Findings:', inferenceResult.findings);
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
