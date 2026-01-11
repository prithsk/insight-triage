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
          throw signedUrlError;
        }

        setImageUrl(data.signedUrl);
      } catch (err) {
        console.error('Failed to fetch image:', err);
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
