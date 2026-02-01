-- Migration: Harden Contract Schema
-- Description: Ensures all columns needed for contract management exist and forces a schema cache refresh.

BEGIN;

-- 1. Ensure all expected columns exist on the contracts table
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS pets_allowed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS special_clauses TEXT,
ADD COLUMN IF NOT EXISTS guarantees TEXT,
ADD COLUMN IF NOT EXISTS guarantors_info TEXT,
ADD COLUMN IF NOT EXISTS needs_painting BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS option_notice_days INTEGER,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Force PostgREST schema cache refresh
-- Redefining a generic function is a reliable way to trigger a reload in Supabase
CREATE OR REPLACE FUNCTION public.refresh_schema_cache()
RETURNS void AS $$
BEGIN
  -- This function exists solely to trigger a schema cache refresh
  NULL;
END;
$$ LANGUAGE plpgsql;

SELECT public.refresh_schema_cache();

COMMIT;
