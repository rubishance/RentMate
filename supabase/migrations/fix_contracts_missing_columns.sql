-- Fix Contracts Table Schema
-- Adds missing Foreign Keys and other essential columns

-- 1. Foreign Keys (Crucial for the error you saw)
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id),
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 2. Other Missing Columns (preventing future errors)
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS signing_date date,
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date,
ADD COLUMN IF NOT EXISTS base_rent numeric(10, 2),
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'ILS',
ADD COLUMN IF NOT EXISTS payment_frequency text,
ADD COLUMN IF NOT EXISTS payment_day integer,
ADD COLUMN IF NOT EXISTS linkage_type text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS security_deposit_amount numeric(10, 2),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 3. Linkage Details
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS base_index_date date,
ADD COLUMN IF NOT EXISTS base_index_value numeric(10, 4),
ADD COLUMN IF NOT EXISTS linkage_sub_type text,
ADD COLUMN IF NOT EXISTS linkage_ceiling numeric(5, 2),
ADD COLUMN IF NOT EXISTS linkage_floor numeric(5, 2);

-- 4. Permissions
GRANT ALL ON public.contracts TO postgres, service_role, authenticated;
