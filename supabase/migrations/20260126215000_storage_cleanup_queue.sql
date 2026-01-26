-- Migration: storage_cleanup_system
-- Description: Adds a queue system to clean up storage files when DB records are deleted.

-- 1. Create Cleanup Queue Table
CREATE TABLE IF NOT EXISTS public.storage_cleanup_queue (
    id BIGSERIAL PRIMARY KEY,
    bucket_id TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    error_log TEXT
);

-- Enable RLS (Internal only, but good practice)
ALTER TABLE public.storage_cleanup_queue ENABLE ROW LEVEL SECURITY;

-- 2. Create Trigger Function
CREATE OR REPLACE FUNCTION public.queue_storage_cleanup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.storage_cleanup_queue (bucket_id, storage_path)
    VALUES (OLD.storage_bucket, OLD.storage_path);
    RETURN OLD;
END;
$$;

-- 3. Attach Trigger to property_documents
DROP TRIGGER IF EXISTS on_document_deleted_cleanup ON public.property_documents;
CREATE TRIGGER on_document_deleted_cleanup
AFTER DELETE ON public.property_documents
FOR EACH ROW
EXECUTE FUNCTION public.queue_storage_cleanup();

-- 4. Comment
COMMENT ON TABLE public.storage_cleanup_queue IS 'Queue for files that need to be deleted from Supabase Storage by a background worker.';
