-- ============================================
-- STORAGE POLICIES: ADMIN & DOCUMENTS (SAFE VERSION)
-- ============================================

-- 1. Create Bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('secure_documents', 'secure_documents', false, false, 5242880, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- 2. ENABLE RLS - SKIPPED
-- This command often fails due to permissions on the system 'storage' schema. 
-- RLS is enabled by default on Supabase storage.objects.
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES

-- Policy: Admin can do ANYTHING in 'secure_documents'
DROP POLICY IF EXISTS "Admins full access to secure_documents" ON storage.objects;
CREATE POLICY "Admins full access to secure_documents"
    ON storage.objects
    FOR ALL
    USING (
        bucket_id = 'secure_documents' 
        AND 
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        bucket_id = 'secure_documents' 
        AND 
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Policy: Users can VIEW their OWN files
DROP POLICY IF EXISTS "Users view own secure documents" ON storage.objects;
CREATE POLICY "Users view own secure documents"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'secure_documents'
        AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Users can UPLOAD to their OWN folder (Optional)
DROP POLICY IF EXISTS "Users upload own documents" ON storage.objects;
CREATE POLICY "Users upload own documents"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'secure_documents'
        AND
        (storage.foldername(name))[1] = auth.uid()::text
        AND
        auth.role() = 'authenticated'
    );
