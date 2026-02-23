-- Migration: Sync Staging to Production
-- Description: Adds missing JSONB and financial columns to the contracts and payments tables in Staging.

-- 1. Contracts Table Updates
ALTER TABLE IF EXISTS public.contracts 
ADD COLUMN IF NOT EXISTS tenants JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS option_periods JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS rent_periods JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS special_clauses TEXT,
ADD COLUMN IF NOT EXISTS guarantees TEXT,
ADD COLUMN IF NOT EXISTS guarantors_info TEXT,
ADD COLUMN IF NOT EXISTS pets_allowed BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.contracts.tenants IS 'List of tenants associated with the contract.';
COMMENT ON COLUMN public.contracts.option_periods IS 'Standardized option/extension periods.';
COMMENT ON COLUMN public.contracts.rent_periods IS 'Rent steps and changes over time.';

-- 2. Payments Table Updates
ALTER TABLE IF EXISTS public.payments
ADD COLUMN IF NOT EXISTS original_amount NUMERIC,
ADD COLUMN IF NOT EXISTS index_linkage_rate NUMERIC;

COMMENT ON COLUMN public.payments.original_amount IS 'The amount before linkage or other adjustments.';
COMMENT ON COLUMN public.payments.index_linkage_rate IS 'The rate used for index linkage calculation.';
