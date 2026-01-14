-- ============================================
-- Fix Row Level Security - MINIMAL
-- Only properties and tenants tables
-- ============================================

-- Fix properties table
DROP POLICY IF EXISTS "Allow all on properties" ON properties;
CREATE POLICY "Allow all on properties" 
    ON properties 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Fix tenants table
DROP POLICY IF EXISTS "Allow all on tenants" ON tenants;
CREATE POLICY "Allow all on tenants" 
    ON tenants 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Show success
SELECT '✅ RLS policies fixed for properties and tenants!' AS status;
