-- ============================================
-- EMERGENCY FIX V2: SECURE ALL USER DATA WITH PROPER RLS
-- This version drops ALL policies first to avoid conflicts
-- ============================================

-- 1. DROP ALL EXISTING POLICIES (to avoid conflicts)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public' 
              AND tablename IN ('properties', 'tenants', 'contracts', 'payments'))
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 2. ENSURE USER_ID COLUMNS EXIST
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. ENABLE RLS ON ALL TABLES
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 4. CREATE SECURE POLICIES FOR PROPERTIES
CREATE POLICY "Users can view own properties"
    ON properties FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own properties"
    ON properties FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own properties"
    ON properties FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own properties"
    ON properties FOR DELETE
    USING (user_id = auth.uid());

-- 5. CREATE SECURE POLICIES FOR TENANTS
CREATE POLICY "Users can view own tenants"
    ON tenants FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tenants"
    ON tenants FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tenants"
    ON tenants FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own tenants"
    ON tenants FOR DELETE
    USING (user_id = auth.uid());

-- 6. CREATE SECURE POLICIES FOR CONTRACTS
CREATE POLICY "Users can view own contracts"
    ON contracts FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own contracts"
    ON contracts FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own contracts"
    ON contracts FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own contracts"
    ON contracts FOR DELETE
    USING (user_id = auth.uid());

-- 7. CREATE SECURE POLICIES FOR PAYMENTS
CREATE POLICY "Users can view own payments"
    ON payments FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own payments"
    ON payments FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own payments"
    ON payments FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own payments"
    ON payments FOR DELETE
    USING (user_id = auth.uid());

-- 8. BACKFILL EXISTING DATA
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Get the first user's ID
    SELECT id INTO first_user_id FROM auth.users ORDER BY created_at LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
        -- Update all NULL user_id records
        UPDATE properties SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE tenants SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE contracts SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE payments SET user_id = first_user_id WHERE user_id IS NULL;
        
        RAISE NOTICE 'Backfilled user_id for existing records to user: %', first_user_id;
    END IF;
END $$;

-- 9. VERIFY RLS IS ENABLED
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename, rowsecurity 
              FROM pg_tables 
              WHERE schemaname = 'public' 
              AND tablename IN ('properties', 'tenants', 'contracts', 'payments'))
    LOOP
        IF NOT r.rowsecurity THEN
            RAISE EXCEPTION 'RLS is NOT enabled on table: %', r.tablename;
        ELSE
            RAISE NOTICE 'RLS is enabled on table: %', r.tablename;
        END IF;
    END LOOP;
END $$;
