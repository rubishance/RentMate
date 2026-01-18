-- ============================================
-- ADD USER_ID TO EXISTING TABLES (MULTI-TENANCY)
-- ============================================

-- 1. ADD COLUMN TO TABLES
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE;

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE;

ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE;

-- (If you have a payments table)
-- ALTER TABLE payments
-- ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE;

-- 2. ENABLE RLS ON ALL TABLES (If not already enabled)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- 3. UPDATE POLICIES

-- PROPERTIES
DROP POLICY IF EXISTS "Users can view own properties" ON properties;
CREATE POLICY "Users can view own properties"
    ON properties FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own properties" ON properties;
CREATE POLICY "Users can insert own properties"
    ON properties FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own properties" ON properties;
CREATE POLICY "Users can update own properties"
    ON properties FOR UPDATE
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own properties" ON properties;
CREATE POLICY "Users can delete own properties"
    ON properties FOR DELETE
    USING (user_id = auth.uid());

-- TENANTS
DROP POLICY IF EXISTS "Users can view own tenants" ON tenants;
CREATE POLICY "Users can view own tenants"
    ON tenants FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own tenants" ON tenants;
CREATE POLICY "Users can insert own tenants"
    ON tenants FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own tenants" ON tenants;
CREATE POLICY "Users can update own tenants"
    ON tenants FOR UPDATE
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own tenants" ON tenants;
CREATE POLICY "Users can delete own tenants"
    ON tenants FOR DELETE
    USING (user_id = auth.uid());

-- CONTRACTS
DROP POLICY IF EXISTS "Users can view own contracts" ON contracts;
CREATE POLICY "Users can view own contracts"
    ON contracts FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own contracts" ON contracts;
CREATE POLICY "Users can insert own contracts"
    ON contracts FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own contracts" ON contracts;
CREATE POLICY "Users can update own contracts"
    ON contracts FOR UPDATE
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own contracts" ON contracts;
CREATE POLICY "Users can delete own contracts"
    ON contracts FOR DELETE
    USING (user_id = auth.uid());

-- 4. FUNCTION TO BACKFILL DATA (For Dev/Migration)
-- If there are existing records with NULL user_id, assign them to a specific user?
-- For now, we will leave them null or you can manually run:
-- UPDATE properties SET user_id = 'YOUR_UUID' WHERE user_id IS NULL;
