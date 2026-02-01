-- Migration: Expand Contract Fields
-- Description: Adds pets_allowed, special_clauses, guarantees, and guarantors_info to the contracts table.

ALTER TABLE IF EXISTS public.contracts 
ADD COLUMN IF NOT EXISTS pets_allowed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS special_clauses TEXT,
ADD COLUMN IF NOT EXISTS guarantees TEXT,
ADD COLUMN IF NOT EXISTS guarantors_info TEXT;

COMMENT ON COLUMN public.contracts.pets_allowed IS 'Indicates if pets are allowed in the property.';
COMMENT ON COLUMN public.contracts.special_clauses IS 'Additional special clauses or terms in the contract.';
COMMENT ON COLUMN public.contracts.guarantees IS 'Detailed information about bank guarantees or other financial security.';
COMMENT ON COLUMN public.contracts.guarantors_info IS 'Personal information of the guarantors (names, IDs, addresses).';
