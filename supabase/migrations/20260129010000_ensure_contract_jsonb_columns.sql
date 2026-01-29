-- Migration: Ensure Contract JSONB Columns
-- Description: Adds missing JSONB columns and ensures correct types for option_periods and rent_periods.

-- 1. Ensure rent_periods exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'rent_periods') THEN
        ALTER TABLE public.contracts ADD COLUMN rent_periods JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 2. Ensure option_periods exists (backfill if needed, though previously added)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'option_periods') THEN
        ALTER TABLE public.contracts ADD COLUMN option_periods JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 3. Ensure tenants exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'tenants') THEN
        ALTER TABLE public.contracts ADD COLUMN tenants JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

COMMENT ON COLUMN public.contracts.rent_periods IS 'Array of scheduled rent changes.';
COMMENT ON COLUMN public.contracts.option_periods IS 'Array of extension period configurations.';
COMMENT ON COLUMN public.contracts.tenants IS 'Embedded array of tenant objects.';
