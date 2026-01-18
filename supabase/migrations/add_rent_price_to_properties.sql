-- Migration to add missing rent_price column to properties table
-- Fixes error: Could not find the 'rent_price' column of 'properties' in the schema cache

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS rent_price NUMERIC(10, 2);

-- Also ensure RLS is enabled as a best practice, though likely already on
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
