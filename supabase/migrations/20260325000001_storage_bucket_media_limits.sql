-- Allow Video uploads and dynamically size limits in Secure Documents
-- Removing the native block preventing large files or non-PDF/Images from uploading to secure_documents
-- Allowed size bumped to 2GB physically (1048576 * 2000), specific business quota controlled at DB trigger level

UPDATE storage.buckets 
SET 
    allowed_mime_types = ARRAY[
        'application/pdf', 
        'image/jpeg', 
        'image/png', 
        'image/webp',
        'video/mp4', 
        'video/quicktime',
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
        'application/vnd.ms-excel', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    file_size_limit = 2147483647
WHERE id = 'secure_documents';
