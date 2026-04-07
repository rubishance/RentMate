-- Ensure RLS is enabled just in case


-- Drop previous restrictive policies if testing re-runs
DROP POLICY IF EXISTS "Prevent delete on protocol_evidence" ON storage.objects;
DROP POLICY IF EXISTS "Prevent update on protocol_evidence" ON storage.objects;

-- Create restrictive policies to ensure evidence is immutable
-- Restrictive policies act as a "logical AND", so if this returns false, the action is denied unconditionally
CREATE POLICY "Prevent delete on protocol_evidence"
ON storage.objects AS RESTRICTIVE FOR DELETE
USING (bucket_id != 'protocol_evidence');

CREATE POLICY "Prevent update on protocol_evidence"
ON storage.objects AS RESTRICTIVE FOR UPDATE
USING (bucket_id != 'protocol_evidence');
