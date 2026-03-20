-- Set up Row Level Security (RLS) for protocol_evidence bucket idempotently

DO $$
BEGIN
    -- Public Access
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public Access for protocol evidence'
    ) THEN
        CREATE POLICY "Public Access for protocol evidence" 
        ON storage.objects FOR SELECT 
        USING ( bucket_id = 'protocol_evidence' );
    END IF;

    -- Upload Access
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated users can upload protocol evidence'
    ) THEN
        CREATE POLICY "Authenticated users can upload protocol evidence" 
        ON storage.objects FOR INSERT 
        WITH CHECK ( bucket_id = 'protocol_evidence' AND auth.role() = 'authenticated' );
    END IF;

    -- Delete Access
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated users can delete protocol evidence'
    ) THEN
        CREATE POLICY "Authenticated users can delete protocol evidence" 
        ON storage.objects FOR DELETE 
        USING ( bucket_id = 'protocol_evidence' AND auth.role() = 'authenticated' );
    END IF;
END $$;
