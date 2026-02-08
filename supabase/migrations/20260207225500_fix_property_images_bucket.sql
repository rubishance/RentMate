-- Migration: Unified Property Images Security (v2 - Consolidated)
-- Description: Unifies bucket naming to 'property-images' and enforces strict owner-only RLS.
-- Consolidated to a single policy definition to avoid execution collision.

BEGIN;

-- 1. CLEAN UP UNDERSCORE MISMATCHES & OLD POLICIES
DROP POLICY IF EXISTS "Users view own images" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own images" ON storage.objects;
DROP POLICY IF EXISTS "Secure Access: Property Images" ON storage.objects;

-- 2. ENSURE CORRECT BUCKET NAME 'property-images' IS PRIVATE
UPDATE storage.buckets 
SET public = false 
WHERE id = 'property-images';

-- 3. APPLY CONSOLIDATED RLS TO 'property-images'
-- Handles both direct user uploads and Google Maps imports
CREATE POLICY "Secure Access: Property Images"
    ON storage.objects
    FOR ALL
    USING (
        bucket_id = 'property-images'
        AND (
            -- Direct user-id folder: {userId}/filename
            (storage.foldername(name))[1] = auth.uid()::text
            OR
            -- Google imports folder: google-imports/{userId}/filename
            (
                (storage.foldername(name))[1] = 'google-imports' 
                AND 
                (storage.foldername(name))[2] = auth.uid()::text
            )
        )
    )
    WITH CHECK (
        bucket_id = 'property-images'
        AND (
            -- Direct user-id folder
            (storage.foldername(name))[1] = auth.uid()::text
            OR
            -- Google imports folder
            (
                (storage.foldername(name))[1] = 'google-imports' 
                AND 
                (storage.foldername(name))[2] = auth.uid()::text
            )
        )
    );

COMMIT;
NOTIFY pgrst, 'reload schema';
