-- Migration: Enable public read access for Calculator Magnet Page
-- Date: 2026-02-04
-- Author: Maestro (via Agent)

-- 1. Index Data (Already has RLS enabled)
-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read access to index_data" ON index_data;

CREATE POLICY "Allow public read access to index_data"
ON index_data
FOR SELECT
TO anon
USING (true);

-- 2. Index Bases (Ensure RLS is on and policy exists)
ALTER TABLE index_bases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to index_bases" ON index_bases;

CREATE POLICY "Allow public read access to index_bases"
ON index_bases
FOR SELECT
TO anon
USING (true);

-- Ensure authenticated users can still read (in case previous logic relied on default open access for bases)
DROP POLICY IF EXISTS "Allow authenticated users to read index_bases" ON index_bases;

CREATE POLICY "Allow authenticated users to read index_bases"
ON index_bases
FOR SELECT
TO authenticated
USING (true);
