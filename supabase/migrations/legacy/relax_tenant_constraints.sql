-- Relax legacy constraints on tenants table to prevent errors
-- This makes specific columns optional (nullable)

ALTER TABLE public.tenants ALTER COLUMN monthly_rent DROP NOT NULL;

-- Also relax others that might be legacy leftovers
ALTER TABLE public.tenants ALTER COLUMN full_name DROP NOT NULL;
ALTER TABLE public.tenants ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.tenants ALTER COLUMN email DROP NOT NULL;

-- Ensure properties constraints are also reasonable
ALTER TABLE public.properties ALTER COLUMN rent_price DROP NOT NULL;
