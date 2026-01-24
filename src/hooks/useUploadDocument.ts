import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadDocumentResult {
  documentId: string;
  filePath: string;
  name: string;
}

export type DocumentType = "sop" | "guideline" | "lab_pdf" | "report";

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.')).toLowerCase();
}

function isAllowedFileType(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ALLOWED_EXTENSIONS.includes(ext);
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
      // Validate file type
      if (!isAllowedFileType(file.name)) {
        throw new Error(`Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File too large. Maximum size is 50MB.');
      }

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
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
      const docType = inferDocType(file.name);
      
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .insert({
          name: file.name,
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
        name: file.name,
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
  return useQueryClient();
}
