-- Migration: Embed Tenants in Contracts
-- Description: Adds a 'tenants' jsonb column to the contracts table to support multiple tenants per contract and removes the need for a separate tenants table.

-- 1. Add the column
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS tenants jsonb DEFAULT '[]'::jsonb;

-- 2. Backfill existing data
UPDATE public.contracts c
SET tenants = jsonb_build_array(
    jsonb_build_object(
        'name', t.name,
        'id_number', t.id_number,
        'email', t.email,
        'phone', t.phone
    )
)
FROM public.tenants t
WHERE c.tenant_id = t.id
AND (c.tenants IS NULL OR c.tenants = '[]'::jsonb);

-- 3. Update the view/trigger if necessary (none found in research)

COMMENT ON COLUMN public.contracts.tenants IS 'List of tenants associated with this contract. Replaces the external tenants table.';
