-- Migration: Enhanced Storage Security for property-images
-- Sets up robust RLS policies for both manual and automated uploads.

BEGIN;

-- 1. Remove all old policies to start fresh
DROP POLICY IF EXISTS "Secure Access: Property Images" ON storage.objects;
DROP POLICY IF EXISTS "Users view own images" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own images" ON storage.objects;
DROP POLICY IF EXISTS "Manual uploads ownership" ON storage.objects;
DROP POLICY IF EXISTS "Google imports ownership" ON storage.objects;

-- 2. Ensure bucket is private
UPDATE storage.buckets SET public = false WHERE id = 'property-images';

-- 3. Policy for manual uploads: {userId}/{fileName}
CREATE POLICY "Manual uploads ownership"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'property-images' AND
    (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
    bucket_id = 'property-images' AND
    (storage.foldername(name))[1] = (auth.uid())::text
);

-- 4. Policy for Google imports: google-imports/{userId}/{fileName}
CREATE POLICY "Google imports ownership"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'property-images' AND
    (storage.foldername(name))[1] = 'google-imports' AND
    (storage.foldername(name))[2] = (auth.uid())::text
)
WITH CHECK (
    bucket_id = 'property-images' AND
    (storage.foldername(name))[1] = 'google-imports' AND
    (storage.foldername(name))[2] = (auth.uid())::text
);

COMMIT;
NOTIFY pgrst, 'reload schema';
