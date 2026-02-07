-- Migration: Storage Bucket Hardening
-- Description: Sets sensitive buckets to private and enforces RLS.

-- 1. Harden 'contracts' bucket
UPDATE storage.buckets 
SET public = false 
WHERE id = 'contracts';

-- 2. Harden 'property_images' bucket (if it exists)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'property_images';

-- 3. Ensure 'secure_documents' is private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'secure_documents';

-- 4. Apply strict RLS for 'contracts' bucket matching 'secure_documents' pattern
DROP POLICY IF EXISTS "Users view own contracts" ON storage.objects;
CREATE POLICY "Users view own contracts"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'contracts'
        AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users upload own contracts" ON storage.objects;
CREATE POLICY "Users upload own contracts"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'contracts'
        AND
        (storage.foldername(name))[1] = auth.uid()::text
        AND
        auth.role() = 'authenticated'
    );

-- 5. Repeat for 'property_images'
DROP POLICY IF EXISTS "Users view own images" ON storage.objects;
CREATE POLICY "Users view own images"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'property_images'
        AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users upload own images" ON storage.objects;
CREATE POLICY "Users upload own images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'property_images'
        AND
        (storage.foldername(name))[1] = auth.uid()::text
        AND
        auth.role() = 'authenticated'
    );

NOTIFY pgrst, 'reload schema';
