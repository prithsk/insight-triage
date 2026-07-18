import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sanitizeString, logSecurityEvent, checkRateLimit } from "@/lib/security";

interface UploadDocumentResult {
  documentId: string;
  filePath: string;
  name: string;
}

export type DocumentType = "sop" | "guideline" | "lab_pdf" | "report";

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const SUSPICIOUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.js', '.html', '.php'];

function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.')).toLowerCase();
}

function isAllowedFileType(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ALLOWED_EXTENSIONS.includes(ext);
}

function validateDocumentFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size must be less than 50MB' };
  }

  const fileName = file.name.toLowerCase();
  if (!isAllowedFileType(fileName)) {
    return { valid: false, error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` };
  }

  // Double-extension check (e.g. report.pdf.exe)
  const parts = fileName.split('.');
  if (parts.length > 2) {
    for (const ext of SUSPICIOUS_EXTENSIONS) {
      if (fileName.includes(ext)) {
        logSecurityEvent('validation_failure', {
          type: 'suspicious_file_extension',
          filename: fileName.substring(0, 50),
        });
        return { valid: false, error: 'Invalid file type' };
      }
    }
  }

  return { valid: true };
}

function inferDocType(filename: string): DocumentType {
  const lowerName = filename.toLowerCase();
  if (lowerName.includes('sop') || lowerName.includes('protocol')) return 'sop';
  if (lowerName.includes('guideline')) return 'guideline';
  if (lowerName.includes('lab') || lowerName.includes('reference')) return 'lab_pdf';
  return 'report';
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (file: File): Promise<UploadDocumentResult> => {
      // Rate limiting: max 10 uploads per minute
      const rateLimit = checkRateLimit('document-upload', 10, 60 * 1000);
      if (!rateLimit.allowed) {
        throw new Error('Upload rate limit exceeded. Please wait a moment.');
      }

      const validation = validateDocumentFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Generate unique file path with sanitized name
      const timestamp = Date.now();
      const sanitizedName = sanitizeString(file.name)
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .substring(0, 100);
      const filePath = `uploads/${timestamp}_${sanitizedName}`;
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create document record
      const displayName = sanitizeString(file.name).substring(0, 200);
      const docType = inferDocType(file.name);

      const { data: doc, error: docError } = await supabase
        .from('documents')
        .insert({
          name: displayName,
          doc_type: docType,
          file_path: filePath,
          status: 'PENDING',
          uploaded_by: user?.id,
        })
        .select()
        .single();
      
      if (docError) {
        // Clean up uploaded file if record creation fails
        await supabase.storage.from('documents').remove([filePath]);
        throw new Error(`Failed to create document record: ${docError.message}`);
      }
      
      return {
        documentId: doc.id,
        filePath,
        name: displayName,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(`Document "${result.name}" uploaded successfully`);
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    }
  });
}

export function useUploadMultipleDocuments() {
  const uploadDocument = useUploadDocument();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (files: File[]) => {
      const results: UploadDocumentResult[] = [];
      const errors: string[] = [];
      
      for (const file of files) {
        try {
          const result = await uploadDocument.mutateAsync(file);
          results.push(result);
        } catch (error) {
          errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      return { results, errors };
    },
    onSuccess: ({ results, errors }) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      
      if (results.length > 0) {
        toast.success(`${results.length} document(s) uploaded successfully`);
      }
      
      if (errors.length > 0) {
        toast.error(`${errors.length} upload(s) failed`, {
          description: errors[0]
        });
      }
    }
  });
}

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, name, doc_type, status, created_at, file_path')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
