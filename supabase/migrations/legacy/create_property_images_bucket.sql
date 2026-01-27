-- Create a public bucket for property images
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('property-images', 'property-images', true, false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Policy: Public can VIEW files (It's a public bucket, but good to be explicit for SELECT)
DROP POLICY IF EXISTS "Public can view property images" ON storage.objects;
CREATE POLICY "Public can view property images"
    ON storage.objects
    FOR SELECT
    USING ( bucket_id = 'property-images' );

-- Policy: Authenticated users can UPLOAD files
DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
CREATE POLICY "Authenticated users can upload property images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'property-images'
        AND
        auth.role() = 'authenticated'
    );

-- Policy: Users can UPDATE their own files (or all authenticated for now for simplicity in this context, but better to restrict)
-- For now, allowing authenticated users to update/delete for simplicity as ownership tracking on files might be complex without folder structure
DROP POLICY IF EXISTS "Authenticated users can update property images" ON storage.objects;
CREATE POLICY "Authenticated users can update property images"
    ON storage.objects
    FOR UPDATE
    USING ( bucket_id = 'property-images' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Authenticated users can delete property images" ON storage.objects;
CREATE POLICY "Authenticated users can delete property images"
    ON storage.objects
    FOR DELETE
    USING ( bucket_id = 'property-images' AND auth.role() = 'authenticated' );
