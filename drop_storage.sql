ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Note: Dropping policies that might be permissive
DROP POLICY IF EXISTS "Give users access to own folder 70f1a_0" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own protocol evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert protocol evidence" ON storage.objects;

-- Strictly isolated policies based on folder name
CREATE POLICY "Users can view their own protocol evidence"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'protocol_evidence' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can insert protocol evidence"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'protocol_evidence' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
