-- Revoke DELETE privilege explicitly from authenticated and anon roles for storage.objects
REVOKE DELETE ON storage.objects FROM authenticated;
REVOKE DELETE ON storage.objects FROM anon;
