-- Comprehensive migration to fix schema for Tenants and Contracts

-- 1. Fix Tenants Table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS id_number TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Fix Contracts Table (Financials & Linkage)
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS base_rent NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ILS',
ADD COLUMN IF NOT EXISTS payment_frequency TEXT,
ADD COLUMN IF NOT EXISTS payment_day INTEGER,
ADD COLUMN IF NOT EXISTS linkage_type TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS base_index_date DATE,
ADD COLUMN IF NOT EXISTS base_index_value NUMERIC(10, 4), -- More precision for index
ADD COLUMN IF NOT EXISTS security_deposit_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS signing_date DATE,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 3. Add New Linkage Features (Sub-Type and Caps)
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS linkage_sub_type TEXT, -- 'known', 'respect_of', 'base'
ADD COLUMN IF NOT EXISTS linkage_ceiling NUMERIC(5, 2), -- Percentage
ADD COLUMN IF NOT EXISTS linkage_floor NUMERIC(5, 2); -- Percentage

-- 4. Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
