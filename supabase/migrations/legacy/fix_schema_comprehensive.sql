-- COMPREHENSIVE SCHEMA REPAIR
-- Ensures all tables have all columns required by the new Add Contract wizard.

-- 1. PROPERTIES
CREATE TABLE IF NOT EXISTS public.properties (id uuid PRIMARY KEY DEFAULT uuid_generate_v4());
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS rooms numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS size_sqm numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Occupied',
ADD COLUMN IF NOT EXISTS rent_price numeric(10, 2) DEFAULT 0;


-- 2. TENANTS
CREATE TABLE IF NOT EXISTS public.tenants (id uuid PRIMARY KEY DEFAULT uuid_generate_v4());
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS name text,         -- Was missing!
ADD COLUMN IF NOT EXISTS id_number text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text;


-- 3. CONTRACTS
CREATE TABLE IF NOT EXISTS public.contracts (id uuid PRIMARY KEY DEFAULT uuid_generate_v4());
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id),
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id),

-- Dates
ADD COLUMN IF NOT EXISTS signing_date date,
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date,

-- Financials
ADD COLUMN IF NOT EXISTS base_rent numeric(10, 2),
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'ILS',
ADD COLUMN IF NOT EXISTS payment_frequency text,
ADD COLUMN IF NOT EXISTS payment_day integer,

-- Linkage
ADD COLUMN IF NOT EXISTS linkage_type text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS linkage_sub_type text,
ADD COLUMN IF NOT EXISTS linkage_ceiling numeric(5, 2),
ADD COLUMN IF NOT EXISTS linkage_floor numeric(5, 2),
ADD COLUMN IF NOT EXISTS base_index_date date,
ADD COLUMN IF NOT EXISTS base_index_value numeric(10, 4),

-- Apps/Security
ADD COLUMN IF NOT EXISTS security_deposit_amount numeric(10, 2),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 4. GRANT PERMISSIONS (Just in case)
GRANT ALL ON public.properties TO postgres, service_role, authenticated;
GRANT ALL ON public.tenants TO postgres, service_role, authenticated;
GRANT ALL ON public.contracts TO postgres, service_role, authenticated;
