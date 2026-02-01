-- Migration: Fix Orphaned Contract Triggers & Missing Columns
-- Description: Drops legacy triggers referencing the deleted 'tenants' table and adds 'updated_at' to 'contracts'.

BEGIN;

-- 1. Drop the triggers causing "Failed to update contract" (referencing dropped tenants table)
DROP TRIGGER IF EXISTS trigger_sync_tenant_status ON public.contracts;
DROP FUNCTION IF EXISTS public.sync_tenant_status_from_contract();

-- 2. Ensure updated_at column exists for dashboard/sorting reliability
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Create or Update a generic updated_at trigger if not already present
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_contracts_updated_at ON public.contracts;
CREATE TRIGGER tr_contracts_updated_at
    BEFORE UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

COMMIT;
