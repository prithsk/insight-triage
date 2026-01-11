-- Create storage bucket for DICOM files
INSERT INTO storage.buckets (id, name, public) VALUES ('dicom-files', 'dicom-files', false);

-- Create storage policies for authenticated users
CREATE POLICY "Users can upload DICOM files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'dicom-files');

CREATE POLICY "Users can view DICOM files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'dicom-files');

CREATE POLICY "Users can delete their DICOM files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'dicom-files');