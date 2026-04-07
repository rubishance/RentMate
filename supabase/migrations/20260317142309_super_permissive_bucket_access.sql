DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permissive full access to protocol evidence' AND tablename = 'objects') THEN
        DROP POLICY "Permissive full access to protocol evidence" ON storage.objects;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Universal Insert protocol_evidence' AND tablename = 'objects') THEN
        DROP POLICY "Universal Insert protocol_evidence" ON storage.objects;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Universal Select protocol_evidence' AND tablename = 'objects') THEN
        DROP POLICY "Universal Select protocol_evidence" ON storage.objects;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Universal Update protocol_evidence' AND tablename = 'objects') THEN
        DROP POLICY "Universal Update protocol_evidence" ON storage.objects;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Universal Delete protocol_evidence' AND tablename = 'objects') THEN
        DROP POLICY "Universal Delete protocol_evidence" ON storage.objects;
    END IF;
END
$$;

-- Strict Insert (Select/Insert only to authenticated users related to the contract context)
CREATE POLICY "Strict Insert protocol_evidence"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'protocol_evidence' 
    AND auth.role() = 'authenticated'
    AND EXISTS (
        SELECT 1 FROM public.contracts c
        JOIN public.properties p ON c.property_id = p.id
        WHERE c.id::text = (storage.foldername(name))[1]
        AND p.user_id = auth.uid()
    )
);

-- Strict Select
CREATE POLICY "Strict Select protocol_evidence"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'protocol_evidence' 
    AND auth.role() = 'authenticated'
    AND EXISTS (
        SELECT 1 FROM public.contracts c
        JOIN public.properties p ON c.property_id = p.id
        WHERE c.id::text = (storage.foldername(name))[1]
        AND p.user_id = auth.uid()
    )
);

-- Delete and Update are completely blocked (No policies exist)
