-- Drop any old or restrictive policies for this bucket if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access for protocol evidence' AND tablename = 'objects') THEN
        DROP POLICY "Public Access for protocol evidence" ON storage.objects;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload protocol evidence' AND tablename = 'objects') THEN
        DROP POLICY "Authenticated users can upload protocol evidence" ON storage.objects;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete protocol evidence' AND tablename = 'objects') THEN
        DROP POLICY "Authenticated users can delete protocol evidence" ON storage.objects;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon users can upload protocol evidence' AND tablename = 'objects') THEN
        DROP POLICY "Anon users can upload protocol evidence" ON storage.objects;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon users can delete protocol evidence' AND tablename = 'objects') THEN
        DROP POLICY "Anon users can delete protocol evidence" ON storage.objects;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon users can update protocol evidence' AND tablename = 'objects') THEN
        DROP POLICY "Anon users can update protocol evidence" ON storage.objects;
    END IF;
END
$$;

-- Create an all-encompassing, fully permissive policy for 'protocol_evidence' bucket
CREATE POLICY "Permissive full access to protocol evidence" 
ON storage.objects FOR ALL 
USING (bucket_id = 'protocol_evidence') 
WITH CHECK (bucket_id = 'protocol_evidence');
