-- Migration: Storage Fortress (Bucket Security)
-- Description: Sets feedback bucket to private and enforces strict path-based RLS for all sensitive assets.

BEGIN;

-- 1. HARDEN FEEDBACK BUCKET (Critical Fix)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'feedback-screenshots';

-- 2. REMOVE PERMISSIVE FEEDBACK POLICIES
DROP POLICY IF EXISTS "Anyone can view feedback screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload feedback screenshots" ON storage.objects;

-- 3. APPLY OWNER-ONLY FEEDBACK POLICIES
-- Path naming: feedback-screenshots/{user_id}/{filename}
CREATE POLICY "Users can upload own feedback screenshots"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'feedback-screenshots'
        AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can view own feedback screenshots"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'feedback-screenshots'
        AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- 4. VERIFY OTHER BUCKETS ARE PRIVATE
UPDATE storage.buckets SET public = false WHERE id IN ('contracts', 'property_images', 'secure_documents');

-- 5. STANDARDIZE POLICY NAMES FOR AUDITABILITY
DROP POLICY IF EXISTS "Users view own contracts" ON storage.objects;
CREATE POLICY "Secure Access: Contracts"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'contracts' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users view own images" ON storage.objects;
CREATE POLICY "Secure Access: Property Images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'property_images' AND (storage.foldername(name))[1] = auth.uid()::text);

COMMIT;
NOTIFY pgrst, 'reload schema';
