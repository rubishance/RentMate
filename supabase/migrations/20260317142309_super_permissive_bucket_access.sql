DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permissive full access to protocol evidence' AND tablename = 'objects') THEN
        DROP POLICY "Permissive full access to protocol evidence" ON storage.objects;
    END IF;
END
$$;

-- Universal Insert
CREATE POLICY "Universal Insert protocol_evidence"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'protocol_evidence');

-- Universal Select
CREATE POLICY "Universal Select protocol_evidence"
ON storage.objects FOR SELECT
USING (bucket_id = 'protocol_evidence');

-- Universal Update
CREATE POLICY "Universal Update protocol_evidence"
ON storage.objects FOR UPDATE
USING (bucket_id = 'protocol_evidence');

-- Universal Delete
CREATE POLICY "Universal Delete protocol_evidence"
ON storage.objects FOR DELETE
USING (bucket_id = 'protocol_evidence');
