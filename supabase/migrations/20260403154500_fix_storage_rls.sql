-- Migration: Fix Protocol Evidence Storage RLS
-- Drops dangerous universal access and restricts to auth.uid() folder matching
-- Explicitly omits UPDATE and DELETE policies to enforce immutability

-- 1. Drop existing permissive policies
DROP POLICY IF EXISTS "Universal Delete protocol_evidence" ON storage.objects;
DROP POLICY IF EXISTS "Universal Select protocol_evidence" ON storage.objects;
DROP POLICY IF EXISTS "Universal Insert protocol_evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own protocol evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own protocol evidence" ON storage.objects;

-- 2. Create the Strict SELECT Policy
CREATE POLICY "Users can view their own protocol evidence"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'protocol_evidence' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Create the Strict INSERT Policy
CREATE POLICY "Users can upload their own protocol evidence"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'protocol_evidence' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: We intentionally do NOT create policies for UPDATE or DELETE
-- This guarantees evidence immutability (WORM: Write Once, Read Many)
