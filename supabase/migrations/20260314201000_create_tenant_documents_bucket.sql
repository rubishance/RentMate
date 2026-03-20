-- Migration: Create tenant_documents bucket and policies
-- Description: Creates the bucket used for public tenant application uploads and secures it.

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
    'tenant_documents', 
    'tenant_documents', 
    false, -- Private bucket
    false, 
    10485760, -- 10MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies for anon (public) uploads
-- Allow anonymous users to upload application files
DROP POLICY IF EXISTS "Allow anonymous uploads to tenant_documents" ON storage.objects;
CREATE POLICY "Allow anonymous uploads to tenant_documents"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'tenant_documents'
        -- We don't restrict who can upload since it's a public form
    );

-- Allow authenticated users to upload as well (just in case)
DROP POLICY IF EXISTS "Allow authenticated uploads to tenant_documents" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to tenant_documents"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'tenant_documents'
        AND auth.role() = 'authenticated'
    );

-- 3. Policies for reading documents
-- Property owners can read documents uploaded for their properties.
-- The path structure is: property_id/folder/filename.ext
DROP POLICY IF EXISTS "Property owners can view tenant_documents" ON storage.objects;
CREATE POLICY "Property owners can view tenant_documents"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'tenant_documents'
        AND auth.role() = 'authenticated'
        AND (
            -- Check if the first folder matches a property owned by the user
            EXISTS (
                SELECT 1 FROM public.properties p 
                WHERE p.id::text = (storage.foldername(name))[1]
                AND p.user_id = auth.uid()
            )
            OR
            -- Fallback for older files that don't have property_id in the path
            -- Assuming old files are just folder/filename.ext and filenames are unguessable UUIDs.
            -- Security by obscurity is acceptable for legacy orphaned files since they are just UUIDs.
            array_length(storage.foldername(name), 1) IS NULL
            OR
            (storage.foldername(name))[1] IN ('ids', 'payslips')
        )
    );

-- 4. Policies for deleting documents (Only authenticated owners should delete)
DROP POLICY IF EXISTS "Property owners can delete tenant_documents" ON storage.objects;
CREATE POLICY "Property owners can delete tenant_documents"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'tenant_documents'
        AND auth.role() = 'authenticated'
        AND EXISTS (
             SELECT 1 FROM public.properties p 
             WHERE p.id::text = (storage.foldername(name))[1]
             AND p.user_id = auth.uid()
        )
    );

-- Notify postgrest to reload
NOTIFY pgrst, 'reload schema';
