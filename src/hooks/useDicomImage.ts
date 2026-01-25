import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useDicomImage(filePath: string | null) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) {
      setImageUrl(null);
      return;
    }

    const fetchImage = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get a signed URL for the file (valid for 1 hour)
        const { data, error: signedUrlError } = await supabase.storage
          .from('dicom-files')
          .createSignedUrl(filePath, 3600);

        if (signedUrlError) {
          console.error('Signed URL error:', signedUrlError);
          // Provide more specific error messages
          if (signedUrlError.message?.includes('not found')) {
            throw new Error('File not found in storage');
          } else if (signedUrlError.message?.includes('permission') || signedUrlError.message?.includes('policy')) {
            throw new Error('Storage access denied - check bucket policies');
          }
          throw signedUrlError;
        }

        if (!data?.signedUrl) {
          throw new Error('No signed URL returned');
        }

        setImageUrl(data.signedUrl);
      } catch (err) {
        console.error('Failed to fetch image:', err, 'File path:', filePath);
        setError(err instanceof Error ? err.message : 'Failed to load image');
        setImageUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImage();
  }, [filePath]);

  return { imageUrl, isLoading, error };
}
