-- Add extension_option_start column to contracts table
-- This column stores when the tenant's extension option period begins

ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS extension_option_start DATE;

COMMENT ON COLUMN public.contracts.extension_option_start IS 'Date when the tenant can start exercising their extension option';
