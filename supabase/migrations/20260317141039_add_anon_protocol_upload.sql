-- Set up Row Level Security (RLS) for anonymous protocol_evidence uploads

DO $$
BEGIN
    -- Upload Access for Anon
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Anon users can upload protocol evidence'
    ) THEN
        CREATE POLICY "Anon users can upload protocol evidence" 
        ON storage.objects FOR INSERT 
        WITH CHECK ( bucket_id = 'protocol_evidence' AND auth.role() = 'anon' );
    END IF;

    -- Delete Access for Anon
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Anon users can delete protocol evidence'
    ) THEN
        CREATE POLICY "Anon users can delete protocol evidence" 
        ON storage.objects FOR DELETE 
        USING ( bucket_id = 'protocol_evidence' AND auth.role() = 'anon' );
    END IF;
    
    -- Update Access for Anon
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Anon users can update protocol evidence'
    ) THEN
        CREATE POLICY "Anon users can update protocol evidence" 
        ON storage.objects FOR UPDATE 
        USING ( bucket_id = 'protocol_evidence' AND auth.role() = 'anon' );
    END IF;
END $$;
