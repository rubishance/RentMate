-- Migration: secure_tables_rls
-- Description: Enforces strict RLS on properties (assets), contracts, tenants, and payments.

-- ==============================================================================
-- 1. ENSURE PAYMENTS HAS USER_ID (Denormalization for Performance & Strict RLS)
-- ==============================================================================
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- Backfill user_id for payments from contracts
UPDATE public.payments p
SET user_id = c.user_id
FROM public.contracts c
WHERE p.contract_id = c.id
AND p.user_id IS NULL;

-- ==============================================================================
-- 2. ENABLE RLS
-- ==============================================================================
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments   ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. DEFINE POLICIES (DROP EXISTING FIRST)
-- ==============================================================================

-- Helper macro isn't standard SQL, so we repeat the blocks for clarity.

---------------------------------------------------------------------------------
-- TABLE: PROPERTIES (Assets)
---------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can insert own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;
-- Also drop any permissive policies from previous migrations
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.properties;

CREATE POLICY "Users can view own properties"   ON public.properties FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own properties" ON public.properties FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own properties" ON public.properties FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own properties" ON public.properties FOR DELETE USING (user_id = auth.uid());

---------------------------------------------------------------------------------
-- TABLE: CONTRACTS
---------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can insert own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can update own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can delete own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.contracts;

CREATE POLICY "Users can view own contracts"   ON public.contracts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own contracts" ON public.contracts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own contracts" ON public.contracts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own contracts" ON public.contracts FOR DELETE USING (user_id = auth.uid());

---------------------------------------------------------------------------------
-- TABLE: TENANTS
---------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can insert own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can update own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can delete own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.tenants;

CREATE POLICY "Users can view own tenants"   ON public.tenants FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own tenants" ON public.tenants FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own tenants" ON public.tenants FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own tenants" ON public.tenants FOR DELETE USING (user_id = auth.uid());

---------------------------------------------------------------------------------
-- TABLE: PAYMENTS
---------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.payments;
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can delete own payments" ON public.payments;

CREATE POLICY "Users can view own payments"   ON public.payments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own payments" ON public.payments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own payments" ON public.payments FOR DELETE USING (user_id = auth.uid());

