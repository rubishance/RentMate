-- Create property_documents bucket securely over the storage layer
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'property_documents', 
    'property_documents', 
    false, 
    20971520, -- 20MB Security Limit
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
    public = false, 
    file_size_limit = 20971520,
    allowed_mime_types = ARRAY['application/pdf'];

-- Basic Storage Security: Reject all unauthenticated anonymous attempts
CREATE POLICY "Deny Unauthenticated Access to Documents" 
ON storage.objects FOR SELECT 
TO public
USING ( bucket_id = 'property_documents' AND auth.role() = 'authenticated' );
