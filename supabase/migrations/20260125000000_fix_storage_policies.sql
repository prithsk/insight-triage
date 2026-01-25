-- Fix storage policies to explicitly allow authenticated users

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload DICOM files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view DICOM files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their DICOM files" ON storage.objects;

-- Recreate policies with explicit role specification
CREATE POLICY "Authenticated users can upload DICOM files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'dicom-files');

CREATE POLICY "Authenticated users can view DICOM files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'dicom-files');

CREATE POLICY "Authenticated users can update DICOM files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'dicom-files');

CREATE POLICY "Authenticated users can delete DICOM files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'dicom-files');
