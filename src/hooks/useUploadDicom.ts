import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fileUploadSchema, logSecurityEvent, checkRateLimit } from "@/lib/security";

/**
 * A successful upload. `triageResult` is REQUIRED, not optional: this type is
 * only ever produced when a score was returned by the model AND persisted to
 * `triage_results`. Scoring failure throws instead.
 *
 * It used to be optional, and `onSuccess` read a missing bucket as CLEAR — so a
 * study that was never scored announced itself as "🟢 CLEAR" in a toast.
 */
interface UploadResult {
  studyId: string;
  filePath: string;
  triageResult: {
    risk_score: number;
    risk_bucket: string;
    confidence: number;
  };
}

const RISK_BUCKETS = ['CRITICAL', 'REVIEW', 'CLEAR'] as const;

/**
 * Does this response actually carry a score?
 *
 * infer-cxr signals failure with a non-2xx status AND `scored: false`. This
 * checks the payload itself as well, because the property that matters is not
 * "the function answered" but "a model produced a number". A 200 with a missing
 * or non-numeric `risk_score` is a failed inference, and the only honest
 * outcome of a failed inference is an unscored study — never a substituted one.
 */
function isScoredResult(r: unknown): r is {
  risk_score: number;
  risk_bucket: (typeof RISK_BUCKETS)[number];
  confidence: number;
  roi_heatmap?: string | null;
  model_version?: string | null;
  inference_time_ms?: number | null;
  findings?: string[] | null;
} {
  if (!r || typeof r !== 'object') return false;
  const o = r as Record<string, unknown>;
  if (o.scored === false) return false;
  if (typeof o.risk_score !== 'number' || !Number.isFinite(o.risk_score)) return false;
  if (o.risk_score < 0 || o.risk_score > 1) return false;
  if (typeof o.confidence !== 'number' || !Number.isFinite(o.confidence)) return false;
  return RISK_BUCKETS.includes(o.risk_bucket as (typeof RISK_BUCKETS)[number]);
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
      //
      // patient_hash was `Math.random().toString(36).substring(2, 8)` — six
      // base36 characters from a non-cryptographic PRNG, on a column with no
      // UNIQUE constraint. That keyspace is ~2.18e9, which by the birthday
      // bound gives a ~2% chance of at least one collision at 10,000 studies
      // and ~44% at 50,000. A collision silently merges two different
      // patients' studies in the worklist, which on a PHI surface is a
      // correctness failure rather than a cosmetic one.
      //
      // crypto.randomUUID() is CSPRNG-backed and available in every browser
      // this app supports. Truncating to 12 hex characters keeps the label
      // readable while raising the keyspace to ~2.8e14 — collision probability
      // stays below 1e-5 past a million studies.
      const patientHash = `PAT-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
      
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
      
      // 3. Trigger ML inference.
      // infer-cxr calls getUser() on this token, so it must be the signed-in
      // user's session JWT. The publishable anon key authenticates as no one
      // and comes back 401.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Your session expired. Sign in again to run inference.');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/infer-cxr`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ study_id: study.id })
        }
      );
      
      // ── Scoring failed: the study stays UNSCORED ─────────────────────────
      //
      // No `triage_results` row is written. There is no substitute score,
      // because there is nothing honest to substitute — infer-cxr's random
      // fallback was removed for exactly this reason (see that function and
      // CLAUDE.md). The study and its image survive: a radiologist can still
      // open the image, and the worklist already renders this state —
      // `worklistOrder` pins unscored studies last in both sort directions and
      // the row reads "awaiting triage · <elapsed>".
      //
      // `status` goes back to PENDING, the enum's existing "not triaged yet"
      // value. `study_status` has no FAILED member and adding one is a
      // migration; until then PENDING is accurate (nothing has scored this
      // study) even though it does not distinguish "not attempted" from
      // "attempted and failed". The thrown error is what tells the user which.
      const markUnscored = async () => {
        await supabase.from('studies').update({ status: 'PENDING' }).eq('id', study.id);
      };

      if (!response.ok) {
        await markUnscored();
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.code === 'image_unavailable'
            ? 'Uploaded, but the image could not be read for scoring. The study is in the worklist awaiting triage.'
            : error.error || 'Inference failed. The study is in the worklist awaiting triage.'
        );
      }

      const inferenceResult = await response.json();

      if (!isScoredResult(inferenceResult)) {
        await markUnscored();
        throw new Error(
          'Uploaded, but inference returned no usable score. The study is in the worklist awaiting triage.'
        );
      }

      // 4. Store triage result.
      //
      // A failed insert is also an unscored study: the number exists in this
      // tab's memory and nowhere else, so the worklist, the reviewer and every
      // other reader would see no score. Previously this logged and carried on
      // to report success with a score that was never persisted.
      const { error: triageError } = await supabase
        .from('triage_results')
        .insert({
          study_id: study.id,
          risk_score: inferenceResult.risk_score,
          risk_bucket: inferenceResult.risk_bucket,
          confidence: inferenceResult.confidence,
          roi_heatmap_path: inferenceResult.roi_heatmap ?? null,
          model_version: inferenceResult.model_version,
          inference_time_ms: inferenceResult.inference_time_ms
        });

      if (triageError) {
        console.error('Failed to store triage result:', triageError);
        await markUnscored();
        throw new Error(
          `Uploaded and scored, but the result could not be saved: ${triageError.message}. ` +
          `The study is in the worklist awaiting triage.`
        );
      }

      // Log findings if available
      if (inferenceResult.findings && inferenceResult.findings.length > 0) {
        console.log('AI Findings:', inferenceResult.findings);
      }

      // 5. Update study status to QUEUED
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
      
      // `triageResult` is required on this type and its bucket was validated
      // against the enum before the row was written, so this is a total mapping
      // rather than a default. It previously fell through to CLEAR for anything
      // it did not recognise, including nothing at all.
      const bucketLabel = result.triageResult.risk_bucket === 'CRITICAL'
        ? '🔴 CRITICAL'
        : result.triageResult.risk_bucket === 'REVIEW'
        ? '🟡 REVIEW'
        : '🟢 CLEAR';

      toast.success(`Study uploaded and triaged: ${bucketLabel}`, {
        description: `Risk score: ${(result.triageResult.risk_score * 100).toFixed(0)}%`
      });
    },
    onError: (error) => {
      // The message already says which stage failed. Prefixing everything with
      // "Upload failed" contradicted the scoring failures, where the upload
      // succeeded and only the score is missing.
      toast.error(error.message);
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
        const criticalCount = results.filter(r => r.triageResult.risk_bucket === 'CRITICAL').length;
        const reviewCount = results.filter(r => r.triageResult.risk_bucket === 'REVIEW').length;

        let summary = `${results.length} study(ies) uploaded and scored`;
        if (criticalCount > 0) summary += ` • ${criticalCount} CRITICAL`;
        if (reviewCount > 0) summary += ` • ${reviewCount} REVIEW`;

        toast.success(summary);
      }

      if (errors.length > 0) {
        // Not all of these are upload failures. A file whose inference failed
        // was uploaded and is in the worklist, unscored; the per-file message
        // says which happened.
        toast.error(`${errors.length} file(s) did not complete`, {
          description: errors[0]
        });
      }
    }
  });
}
